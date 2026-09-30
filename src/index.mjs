#!/usr/bin/env node
/**
 * Agnes Auto Creator — CLI entry point.
 *
 * Creates Agnes AI accounts (fresh email + random password + random name) and
 * an API key per account, end-to-end.
 *
 * Usage:
 *   node src/index.mjs [options]
 *
 * Options:
 *   -n, --count N      number of accounts (default 1)
 *   -d, --domain D     zenvex receiving domain (default random from list)
 *   -o, --out FILE     output JSON file (default agnes-accounts-<ts>.json)
 *   -t, --timeout MS   max wait for the verification email (default 120000)
 *       --headful      run the browser visibly (debugging)
 *       --concurrency N  parallel accounts (default 1)
 *   -q, --quiet        only print the final summary
 *   -h, --help         show help
 *
 * Exit code: 0 if every account succeeded, 1 otherwise.
 *
 * @module index
 */

import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";
import { provisionOne } from "./core/provision.mjs";
import { log, color } from "./utils/logger.mjs";

const VERSION = "1.0.0";
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

/* ---------------------------------- args --------------------------------- */

function parseArgs(argv) {
  const a = {
    count: 1,
    domain: null,
    out: null,
    timeout: 120000,
    headful: false,
    concurrency: 1,
    quiet: false,
    help: false,
  };
  const need = (i, name) => {
    if (i + 1 >= argv.length) throw new Error(`${name} requires a value`);
    return argv[i + 1];
  };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k === "-n" || k === "--count") a.count = parseInt(need(i, k), 10), i++;
    else if (k === "-d" || k === "--domain") a.domain = need(i, k), i++;
    else if (k === "-o" || k === "--out") a.out = need(i, k), i++;
    else if (k === "-t" || k === "--timeout") a.timeout = parseInt(need(i, k), 10), i++;
    else if (k === "--concurrency") a.concurrency = parseInt(need(i, k), 10), i++;
    else if (k === "--headful") a.headful = true;
    else if (k === "-q" || k === "--quiet") a.quiet = true;
    else if (k === "-h" || k === "--help") a.help = true;
    else throw new Error(`unknown option: ${k}`);
  }
  if (a.count < 1) a.count = 1;
  if (a.concurrency < 1) a.concurrency = 1;
  return a;
}

function help() {
  console.log(`
  ${color.bold("Agnes Auto Creator")} v${VERSION}

  ${color.dim("Create Agnes AI accounts and API keys automatically.")}

  Usage:
    node src/index.mjs [options]

  Options:
    -n, --count N        number of accounts to create      (default 1)
    -d, --domain D       zenvex receiving domain           (default random)
    -o, --out FILE       output JSON file                  (default agnes-accounts-<ts>.json)
    -t, --timeout MS     max wait for the verification email (default 120000)
        --concurrency N  accounts created in parallel       (default 1)
        --headful        show the browser (debugging)
    -q, --quiet          print only the final summary
    -h, --help           show this help

  Examples:
    node src/index.mjs
    node src/index.mjs -n 5 -d znvx.me -o accounts.json
    node src/index.mjs -n 3 --concurrency 2
`);
}

/* ---------------------------------- main --------------------------------- */

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv);
  } catch (e) {
    log.error(e.message);
    process.exit(2);
  }
  if (opts.help) return help();

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outFile = opts.out || `agnes-accounts-${stamp}.json`;

  log.raw(color.cyan("Agnes Auto Creator") + color.dim(` v${VERSION}`));
  log.info(`accounts=${opts.count}  concurrency=${opts.concurrency}  out=${outFile}`);
  if (opts.domain) log.info(`domain locked to ${opts.domain}`);

  const browser = await chromium.launch({
    headless: !opts.headful,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    locale: "en-US",
    viewport: { width: 1366, height: 900 },
  });

  const results = [];
  const flush = async () => writeFile(outFile, JSON.stringify(results, null, 2));

  // Worker pool so we never exceed `concurrency` pages.
  let next = 0;
  async function worker(id) {
    while (true) {
      const i = next++;
      if (i >= opts.count) return;
      if (!opts.quiet) log.raw(color.dim(`\n── account ${i + 1}/${opts.count} ──`));
      const r = await provisionOne(context, {
        domain: opts.domain,
        timeout: opts.timeout,
      });
      results[i] = r;
      await flush(); // incremental: a crash never loses finished accounts
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
    else log.raw(`  ${color.red("✘")} ${r.email || "?"}  ${color.dim(r.error)}`);
  }
  process.exit(ok === results.length && results.length === opts.count ? 0 : 1);
}

main().catch((e) => {
  log.error(e.stack || e.message);
  process.exit(1);
});
