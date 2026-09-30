/**
 * zenvex.dev temporary-inbox reader.
 *
 * zenvex.dev is protected by a Cloudflare anti-bot layer that rejects plain
 * HTTP clients, so the inbox is read through a real Chromium page. Only this
 * module needs the browser; the rest of the flow is plain HTTP.
 *
 * @module inbox/zenvex
 */

import { log } from "../utils/logger.mjs";

export const ZENVEX = "https://zenvex.dev";

/**
 * Receiving domains zenvex.dev currently serves.
 * Override at runtime with the `--domain` flag.
 */
export const ZENVEX_DOMAINS = [
  "souss.dev",
  "znvx.me",
  "zenvex.edu.pl",
  "encg.edu.pl",
  "ensam.edu.pl",
  "ofppt.edu.pl",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Extract the 6-digit code from the rendered page.
 *
 * The email body is injected as escaped HTML, so the code can appear as
 *   verification-code&quot;&gt;123456&lt;
 * or as a normal tag. We try both, then fall back to any 6-digit run.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<string|null>}
 */
export async function extractCode(page) {
  const html = await page.content();
  const block =
    html.match(/verification-code[^>]*>\s*(\d{4,8})/i) ||
    html.match(/verification-code(?:&quot;&gt;|["'&][^0-9]{0,12})(\d{4,8})/i);
  if (block) return block[1];

  const KNOWN_STATIC = new Set(["188173"]); // zenvex landing-page counter
  const codes = [...new Set(html.match(/\b(\d{6})\b/g) || [])].filter(
    (c) => !KNOWN_STATIC.has(c),
  );
  return codes[0] || null;
}

/**
 * Open the inbox for `localPart` and wait for the Agnes verification code.
 *
 * @param {import('playwright').Page} page
 * @param {string} localPart       e.g. "swiftfox123456"
 * @param {{timeout?:number}} [opts]
 * @returns {Promise<string>} the verification code
 */
export async function waitForCode(page, localPart, { timeout = 120000 } = {}) {
  log.step(`opening zenvex inbox for ${localPart}`);
  await page.goto(`${ZENVEX}/`, { waitUntil: "domcontentloaded", timeout: 60000 });

  // Type the local part and open the inbox.
  const input = page.locator("input").first();
  await input.waitFor({ state: "visible", timeout: 30000 });
  await input.click();
  await input.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await input.fill(localPart);
  await page.getByRole("button", { name: /open inbox/i }).click();

  // Wait until the header shows the address we asked for.
  await page.waitForFunction(
    (addr) => document.body.innerText.includes(addr),
    localPart,
    { timeout: 30000 },
  );
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
