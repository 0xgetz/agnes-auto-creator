#!/usr/bin/env node
/**
 * Agnes Auto Creator — CLI entry point (fixed).
 *
 * New over upstream:
 *   --proxy URL            route Chromium AND Agnes API through a proxy
 *   --retries N            retries per account on transient failures (default 3)
 *   --turnstile-timeout MS wait for the Cloudflare challenge (default 120000)
 *   .env support           AGNES_DOMAIN, AGNES_PROXY, AGNES_RETRIES, ...
 *
 * Exit code: 0 only if every account succeeded, 1 otherwise.
 *
 * @module index
 */

import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";
import { provisionOne } from "./core/provision.mjs";
import { buildOptions, parseProxy } from "./utils/config.mjs";
import { log, color } from "./utils/logger.mjs";

const VERSION = "1.1.0";

function help() {
  console.log(`
  ${color.bold("Agnes Auto Creator")} v${VERSION}

  Usage:
    node src/index.mjs [options]

  Options:
    -n, --count N             number of accounts            (default 1)
    -d, --domain D            zenvex receiving domain       (default souss.dev)
    -o, --out FILE            output JSON file              (default agnes-accounts-<ts>.json)
    -t, --timeout MS          max wait for the email        (default 120000)
        --turnstile-timeout MS max wait for Cloudflare      (default 120000)
        --retries N           retries per account           (default 3)
        --concurrency N       accounts in parallel          (default 1)
        --proxy URL           proxy for browser + API       (or set AGNES_PROXY / PROXY_URL)
        --headful             show the browser
    -q, --quiet               print only the final summary
    -h, --help                show this help

  Examples:
    node src/index.mjs
    node src/index.mjs -n 5 -d souss.dev --proxy http://user:pass@host:port
    AGNES_PROXY=socks5://127.0.0.1:1080 node src/index.mjs -n 3 --retries 5
`);
}

async function main() {
  let opts;
  try {
    opts = buildOptions(process.argv);
  } catch (e) {
    log.error(e.message);
    process.exit(2);
  }
  if (opts.help) return help();

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outFile = opts.out || `agnes-accounts-${stamp}.json`;
  const proxy = parseProxy(opts.proxy);

  log.raw(color.cyan("Agnes Auto Creator") + color.dim(` v${VERSION}`));
  log.info(
    `accounts=${opts.count}  concurrency=${opts.concurrency}  retries=${opts.retries}  out=${outFile}`,
  );
  if (opts.domain) log.info(`domain locked to ${opts.domain}`);
  log.info(proxy ? `proxy: ${proxy.server}` : "proxy: none (direct)");

  const browser = await chromium.launch({
    headless: !opts.headful,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    ...(proxy ? { proxy } : {}),
  });

  // The context MUST carry the proxy too: Playwright's context.request
  // (used for all Agnes API calls) ignores browser-level --proxy-host flags
  // and sends traffic directly, which is what causes "too many attempts
  // from this IP" when you run behind a proxy.
  const context = await browser.newContext({
    locale: "en-US",
    viewport: { width: 1366, height: 900 },
    ...(proxy ? { proxy } : {}),
  });

  const results = [];
  const flush = async () => writeFile(outFile, JSON.stringify(results, null, 2));

  let next = 0;
  async function worker(id) {
    while (true) {
      const i = next++;
      if (i >= opts.count) return;
      if (!opts.quiet) log.raw(color.dim(`\n── account ${i + 1}/${opts.count} ──`));
      const r = await provisionOne(context, {
        domain: opts.domain,
        timeout: opts.timeout,
        turnstileTimeout: opts.turnstileTimeout,
        retries: opts.retries,
      });
      results[i] = r;
      await flush();
    }
  }

  try {
    await Promise.all(
      Array.from({ length: Math.min(opts.concurrency, opts.count) }, (_, k) => worker(k)),
    );
  } finally {
    await browser.close().catch(() => {});
  }

  const ok = results.filter((r) => r?.ok).length;
  log.raw("");
  log.info(`done: ${ok}/${results.length} succeeded -> ${outFile}`);
  for (const r of results) {
    if (!r) continue;
    if (r.ok) log.raw(`  ${color.green("✔")} ${r.email}  ${color.dim("key=" + r.api_key)}`);
    else log.raw(`  ${color.red("✘")} ${r.email || "?"}  ${color.dim(r.error_kind + ": " + r.error)}`);
  }
  process.exit(ok === results.length && results.length === opts.count ? 0 : 1);
}

main().catch((e) => {
  log.error(e.stack || e.message);
  process.exit(1);
});
