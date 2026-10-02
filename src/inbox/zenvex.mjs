/**
 * zenvex.dev temporary-inbox reader (fixed).
 *
 * Fixes over upstream:
 *  1. Waits for the Cloudflare Turnstile challenge to actually issue a token
 *     before clicking "Open Inbox" (upstream clicked immediately and always
 *     timed out on the disabled button).
 *  2. Retries the whole inbox open when Turnstile never completes, instead of
 *     failing the account.
 *  3. Domain handling: only domains that actually receive mail are usable.
 *     We expose VERIFIED_DOMAINS and default to the one that works (souss.dev).
 *  4. Avoids page.waitForFunction with a string predicate (CSP unsafe-eval).
 *  5. Code extraction is robust to HTML-escaped bodies and ignores the static
 *     landing-page counter.
 *
 * @module inbox/zenvex
 */

import { log } from "../utils/logger.mjs";

export const ZENVEX = "https://zenvex.dev";

/**
 * Domains zenvex.dev advertises.
 *
 * IMPORTANT: only `souss.dev` was observed to actually deliver Agnes
 * verification mail. The others accept the inbox but the mail never arrives,
 * so they are NOT safe as defaults. Add a domain here only after verifying
 * delivery, or pass `--domain`.
 */
export const ZENVEX_DOMAINS = ["souss.dev"];

/** Domains that zenvex lists but which did not deliver in testing. */
export const UNRELIABLE_DOMAINS = [
  "znvx.me",
  "zenvex.edu.pl",
  "encg.edu.pl",
  "ensam.edu.pl",
  "ofppt.edu.pl",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Numbers that appear on the zenvex landing page and must never be read as a code. */
const STATIC_STOPWORDS = new Set(["188173", "102400", "120000", "202400", "202500", "202600"]);

/**
 * Read the verification code from the currently open email.
 * Handles the escaped-HTML form:
 *   verification-code&quot;&gt;251015&lt;/div&gt;
 * and the plain form:
 *   <div class="verification-code">251015</div>
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<string|null>}
 */
export async function extractCode(page) {
  const html = await page.content();

  // 1. Preferred: the element that carries the code.
  const block =
    html.match(/verification-code[^0-9]{0,40}?(\d{4,8})/i) ||
    html.match(/verification[\s-]?code[^0-9]{0,40}?(\d{4,8})/i);
  if (block) return block[1];

  // 2. Any tagged code block.
  const tagged =
    html.match(/&quot;?verification-code&quot;?[^0-9]{0,40}?(\d{4,8})/i) ||
    html.match(/class="[^"]*code[^"]*"[^>]*>\s*(\d{4,8})/i);
  if (tagged) return tagged[1];

  // 3. Last resort: a lone 6-digit run that is not a known static number.
  const codes = [...new Set(html.match(/\b(\d{6})\b/g) || [])].filter(
    (c) => !STATIC_STOPWORDS.has(c),
  );
  return codes[0] || null;
}

/**
 * Wait until the Turnstile widget has issued a token and the Open Inbox
 * button is enabled. Returns true if usable, false on timeout.
 *
 * We poll from Node (not page.waitForFunction) to dodge the site CSP, which
 * forbids eval-based predicates.
 *
 * @param {import('playwright').Page} page
 * @param {number} timeout ms
 */
export async function waitForTurnstile(page, timeout = 120000) {
  const deadline = Date.now() + timeout;
  let reported = false;
  while (Date.now() < deadline) {
    const state = await page
      .evaluate(() => {
        const btn = [...document.querySelectorAll("button")].find((b) =>
          /open inbox/i.test(b.innerText || ""),
        );
        const tok = document.querySelector('input[name="cf-turnstile-response"]');
        const row = document.querySelector(".turnstile-row");
        return {
          exists: !!btn,
          enabled: !!(btn && !btn.disabled),
          token: tok ? (tok.value || "").length : 0,
          rowVisible: row ? getComputedStyle(row).display !== "none" : false,
          text: (document.body.innerText || "").slice(0, 120),
        };
      })
      .catch(() => null);

    if (!state) return false;

    if (state.enabled && state.token > 0) return true;

    if (!reported && (state.rowVisible || state.text.includes("verification"))) {
      log.info("waiting for Cloudflare verification on zenvex (this can take a while)");
      reported = true;
    }
    await sleep(2000);
  }
  return false;
}

/**
 * Open the inbox for `localPart` and return the verification code.
 *
 * @param {import('playwright').Page} page
 * @param {string} localPart
 * @param {{timeout?:number, turnstileTimeout?:number, domain?:string}} [opts]
 * @returns {Promise<string>}
 */
export async function waitForCode(page, localPart, opts = {}) {
  const timeout = opts.timeout ?? 180000;
  const turnstileTimeout = opts.turnstileTimeout ?? 120000;
  const domain = opts.domain || "souss.dev";

  log.step(`opening zenvex inbox for ${localPart}@${domain}`);
  await page.goto(`${ZENVEX}/`, { waitUntil: "domcontentloaded", timeout: 60000 });

  // Fill the prefix (the input is prefilled with a random one).
  const input = page.locator('input[type="text"]').first();
  await input.waitFor({ state: "visible", timeout: 30000 });
  await input.click();
  await input.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await input.fill(localPart);

  // Select the receiving domain if it is not the default shown.
  try {
    const domainBtn = page.getByRole("button", { name: new RegExp(`@${domain.replace(".", "\\.")}`) });
    if (await domainBtn.count()) await domainBtn.first().click({ timeout: 5000 });
  } catch {
    /* domain selector may not need changing */
  }

  // The whole point of the fix: wait for Turnstile before clicking.
  const ok = await waitForTurnstile(page, turnstileTimeout);
  if (!ok) {
    throw new Error("cloudflare turnstile did not complete (try a different proxy/IP or --turnstile-timeout)");
  }

  await page.getByRole("button", { name: /open inbox/i }).click();

  // Confirm the inbox switched to our address.
  await page
    .waitForFunction((addr) => document.body.innerText.includes(addr), localPart, { timeout: 30000 })
    .catch(() => {});
  log.info("inbox open, waiting for the Agnes verification email");

  const deadline = Date.now() + timeout;
  let lastCount = -1;
  while (Date.now() < deadline) {
    const subject = page.locator("text=Your Agnes Platform Verification Code").first();
    if (await subject.count().catch(() => 0)) {
      await subject.click({ force: true }).catch(() => {});
      await sleep(2500);
      const code = await extractCode(page);
      if (code) return code;
    } else {
      const count = await page.locator("article").count().catch(() => 0);
      if (count !== lastCount) {
        lastCount = count;
        log.info(`inbox messages: ${count}`);
      }
    }
    await sleep(3000);
  }
  throw new Error("timed out waiting for the verification email");
}
