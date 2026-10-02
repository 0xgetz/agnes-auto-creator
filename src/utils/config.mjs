/**
 * Runtime configuration: CLI flags > environment (.env) > defaults.
 *
 * @module utils/config
 */

import { readFileSync, existsSync } from "node:fs";

/** Parse a minimal KEY=VALUE .env file (no expansion, quotes stripped). */
export function loadDotenv(path = ".env") {
  const out = {};
  if (!existsSync(path)) return out;
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

const asInt = (v, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};

/**
 * Build the effective options object.
 * Proxy may come from CLI or from PROXY_URL / HTTP_PROXY / HTTPS_PROXY.
 */
export function buildOptions(argv, env = process.env) {
  const dotenv = loadDotenv();
  const cfg = { ...dotenv, ...env };

  const a = {
    count: asInt(cfg.AGNES_COUNT, 1),
    domain: cfg.AGNES_DOMAIN || null,
    out: null,
    timeout: asInt(cfg.AGNES_TIMEOUT, 120000),
    headful: cfg.AGNES_HEADFUL === "1" || cfg.AGNES_HEADFUL === "true",
    concurrency: asInt(cfg.AGNES_CONCURRENCY, 1),
    quiet: false,
    retries: asInt(cfg.AGNES_RETRIES, 3),
    turnstileTimeout: asInt(cfg.AGNES_TURNSTILE_TIMEOUT, 120000),
    proxy: cfg.AGNES_PROXY || cfg.PROXY_URL || cfg.HTTPS_PROXY || cfg.HTTP_PROXY || null,
    proxyByCountry: cfg.AGNES_PROXY_BY_COUNTRY || null,
    help: false,
  };

  const need = (i, name) => {
    if (i + 1 >= argv.length) throw new Error(`${name} requires a value`);
    return argv[i + 1];
  };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k === "-n" || k === "--count") (a.count = parseInt(need(i, k), 10)), i++;
    else if (k === "-d" || k === "--domain") (a.domain = need(i, k)), i++;
    else if (k === "-o" || k === "--out") (a.out = need(i, k)), i++;
    else if (k === "-t" || k === "--timeout") (a.timeout = parseInt(need(i, k), 10)), i++;
    else if (k === "--concurrency") (a.concurrency = parseInt(need(i, k), 10)), i++;
    else if (k === "--retries") (a.retries = parseInt(need(i, k), 10)), i++;
    else if (k === "--turnstile-timeout") (a.turnstileTimeout = parseInt(need(i, k), 10)), i++;
    else if (k === "--proxy") (a.proxy = need(i, k)), i++;
    else if (k === "--headful") a.headful = true;
    else if (k === "-q" || k === "--quiet") a.quiet = true;
    else if (k === "-h" || k === "--help") a.help = true;
    else throw new Error(`unknown option: ${k}`);
  }

  if (a.count < 1) a.count = 1;
  if (a.concurrency < 1) a.concurrency = 1;
  if (a.retries < 0) a.retries = 0;
  return a;
}

/**
 * Parse a proxy string into Playwright's `{ server, username, password }`.
 * Accepts: http://user:pass@host:port, socks5://host:port, host:port.
 */
export function parseProxy(str) {
  if (!str) return null;
  let s = str.trim();
  if (!/^[a-z0-9+.-]+:\/\//i.test(s)) s = "http://" + s;
  const u = new URL(s);
  const server = `${u.protocol}//${u.host}`;
  const out = { server };
  if (u.username) out.username = decodeURIComponent(u.username);
  if (u.password) out.password = decodeURIComponent(u.password);
  return out;
}
