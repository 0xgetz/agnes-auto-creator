/**
 * Core provisioning flow: one Agnes account + one API key.
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

/**
 * @typedef {Object} ProvisionOptions
 * @property {string} [domain]        zenvex receiving domain
 * @property {number} [timeout]       ms to wait for the verification email
 * @property {string} [keyProfile]    api_key_profile (default "default")
 */

/**
 * Provision a single account end-to-end.
 *
 * @param {import('playwright').BrowserContext} context
 * @param {ProvisionOptions} [opts]
 * @returns {Promise<object>} result record (ok:true) or failure record (ok:false)
 */
export async function provisionOne(context, opts = {}) {
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
    log.step(`provisioning ${email} (name: ${fullName})`);

    await agnes.sendVerificationCode(request, email);
    log.info("verification code requested from Agnes");

    const code = await waitForCode(page, local, { timeout: opts.timeout });
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
    log.ok(`API key created: ${apiKey}`);

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
    log.error(`${email} failed: ${err.message}`);
    return {
      ok: false,
      email,
      error: err.message,
      elapsed_ms: Date.now() - started,
      created_at: new Date().toISOString(),
    };
  } finally {
    await page.close().catch(() => {});
  }
}
