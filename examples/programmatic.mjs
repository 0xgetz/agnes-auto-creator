/**
 * Library example — provision accounts programmatically instead of via the CLI.
 *
 *   node examples/programmatic.mjs
 *
 * This shows how to import the core module directly, e.g. to wire the creator
 * into your own pipeline or a Telegram/Discord bot.
 */

import { chromium } from "playwright";
import { provisionOne } from "../src/core/provision.mjs";

const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const context = await browser.newContext({ userAgent: USER_AGENT, locale: "en-US" });

// Create two accounts sequentially on a specific domain.
for (let i = 0; i < 2; i++) {
  const account = await provisionOne(context, {
    domain: "souss.dev",
    timeout: 120000,
  });
  console.log(account.ok ? `created ${account.email}` : `failed: ${account.error}`);
}

await browser.close();
