/**
 * Core provisioning flow (fixed): one Agnes account + one API key.
 *
 * Fixes over upstream:
 *  - the zenvex step can fail transiently (Cloudflare / mail delay), so each
 *    account is retried with a fresh email up to `opts.retries` times;
 *  - the reason for failure is classified so the caller can rotate proxies;
 *  - Turnstile timeout is passed through and bounded.
 *
 * @module core/provision
 */

import * as agnes from "../agnes/client.mjs";
import { waitForCode, ZENVEX_DOMAINS } from "../inbox/zenvex.mjs";
import {
  randomEmailLocal,
  randomKeyName,
  randomName,
  randomPassword,
  pick,
} from "../utils/random.mjs";
import { log } from "../utils/logger.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Classify an error so callers can decide to retry or rotate. */
function classify(err) {
  const m = (err && err.message ? err.message : String(err)).toLowerCase();
  if (m.includes("turnstile")) return "turnstile";
  if (m.includes("too many registration attempts") && m.includes("domain")) return "rate-domain";
  if (m.includes("too many registration attempts") && m.includes("ip")) return "rate-ip";
  if (m.includes("timed out waiting for the verification email")) return "mail-timeout";
  if (m.includes("verification code is invalid or expired")) return "code-expired";
  return "other";
}

async function attempt(context, opts, attemptNo) {
  const request = context.request;
  const page = await context.newPage();
  const started = Date.now();

  const domain = opts.domain || pick(ZENVEX_DOMAINS);
  const local = randomEmailLocal();
  const email = `${local}@${domain}`;
  const password = randomPassword();
  const fullName = randomName();
  const keyName = randomKeyName();

  try {
    log.step(`[try ${attemptNo}] provisioning ${email} (name: ${fullName})`);

    await agnes.sendVerificationCode(request, email);
    log.info("verification code requested from Agnes");

    const code = await waitForCode(page, local, {
      timeout: opts.timeout,
      turnstileTimeout: opts.turnstileTimeout,
      domain,
    });
    log.info(`verification code received: ${code}`);

    const reg = await agnes.register(request, { email, password, code });
    log.ok(`registered: ${reg.message || "ok"}`);

    const session = await agnes.login(request, { email, password });
    log.ok(`logged in as user ${session.user?.id} (${session.user?.display_id})`);

    const apiKey = await agnes.createApiKey(
      request,
      session.access_token,
      keyName,
      opts.keyProfile || "default",
    );
    log.ok(`API key created`);

    return {
      ok: true,
      email,
      password,
      full_name: fullName,
      email_provider: `zenvex.dev (${domain})`,
      api_key_name: keyName,
      api_key: apiKey,
      user_id: session.user?.id ?? null,
      user_display_id: session.user?.display_id ?? null,
      elapsed_ms: Date.now() - started,
      created_at: new Date().toISOString(),
    };
  } catch (err) {
    const kind = classify(err);
    return {
      ok: false,
      email,
      error: err.message,
      error_kind: kind,
      elapsed_ms: Date.now() - started,
      created_at: new Date().toISOString(),
    };
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * Provision a single account end-to-end, with retries.
 *
 * @param {import('playwright').BrowserContext} context
 * @param {object} [opts]
 * @returns {Promise<object>} result record
 */
export async function provisionOne(context, opts = {}) {
  const retries = Number.isInteger(opts.retries) ? opts.retries : 3;
  let last;
  for (let i = 1; i <= retries + 1; i++) {
    last = await attempt(context, opts, i);
    if (last.ok) return last;

    // Failures that a retry cannot fix: abort immediately.
    if (last.error_kind === "rate-domain" || last.error_kind === "rate-ip") {
      log.warn(`${last.error_kind}: stopping retries for this account`);
      return last;
    }
    if (i <= retries) {
      const backoff = Math.min(8000 * i, 30000);
      log.warn(`attempt ${i} failed (${last.error_kind}); retrying in ${backoff}ms`);
      await sleep(backoff);
    }
  }
  return last;
}
