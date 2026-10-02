# Agnes Auto Creator — fixed (v1.1.0)

A hardened fork of [0xgetz/agnes-auto-creator](https://github.com/0xgetz/agnes-auto-creator).
End-to-end provisioning of Agnes AI accounts + API keys, with the real
failure modes from live testing fixed.

## What was broken (verified by running it)

| # | Problem | Symptom | Fix |
|---|---------|---------|-----|
| 1 | **Clicking "Open Inbox" before Cloudflare Turnstile finishes** | `locator.click: Timeout 30000ms exceeded — element is not enabled` — the button is disabled until the challenge issues a token | `waitForTurnstile()` polls (from Node, not an eval-based page predicate) until the token exists and the button is enabled, up to `--turnstile-timeout` |
| 2 | **No retries** | One transient mail delay or Turnstile hiccup kills the account | Each account is retried with a fresh email `--retries` (default 3) with backoff |
| 3 | **Bad default domain list** | Script picks a random domain from 6; only `souss.dev` actually delivers Agnes mail — the rest time out | Default is now `souss.dev`; other domains are marked `UNRELIABLE_DOMAINS` |
| 4 | **Proxy only applied to the browser, not the API** | Behind a proxy you still get `Too many registration attempts from this IP` because `context.request` ignores browser-level proxy flags | `--proxy` is applied to **both** `chromium.launch` and `browser.newContext`, so API calls exit through the proxy too |
| 5 | **`page.waitForFunction` with a string predicate** | `EvalError: Refused to evaluate a string as JavaScript ... unsafe-eval` (site CSP) | Replaced with a Node-side polling loop |
| 6 | **Code extraction could pick a static page counter** | Sends `188173` (the zenvex landing-page counter) instead of the real code | Stop-word list + priority regexes for the escaped-HTML body |
| 7 | **No error classification** | Caller can't tell a retryable error from a rate limit | Errors are tagged `rate-ip`, `rate-domain`, `turnstile`, `mail-timeout`, `code-expired`, `other` |

## Requirements

- Node.js 18+ (tested on 22)
- Chromium via `npx playwright install chromium` **plus** the OS libraries
  (`npx playwright install --with-deps chromium`, needs apt)
- Network egress from a **clean IP**. This is the hard part — see below.

## Install

```bash
git clone https://github.com/0xgetz/agnes-auto-creator.git
cd agnes-auto-creator
# copy the fixed src/ files from this folder over the repo
npm install
npx playwright install --with-deps chromium
cp .env.example .env      # edit as needed
```

## Usage

```bash
# one account (default domain souss.dev)
node src/index.mjs

# five accounts, two at a time
node src/index.mjs -n 5 --concurrency 2

# through a proxy (applied to browser AND API)
node src/index.mjs --proxy http://user:pass@host:port

# tune waits and retries
node src/index.mjs --retries 5 --turnstile-timeout 180000 -t 240000
```

Flags: `-n/--count`, `-d/--domain`, `-o/--out`, `-t/--timeout`,
`--turnstile-timeout`, `--retries`, `--concurrency`, `--proxy`, `--headful`,
`-q/--quiet`, `-h/--help`.

## The proxy question (measured)

Cloudflare Turnstile + Agnes' per-IP and per-domain rate limits are the real
obstacles. From testing:

- **254 public "free" proxies tested → 0 worked** for the Cloudflare-protected
  inbox (and the wider web). Independent testing (ScrapeOps, 1,200+ proxies)
  reports average success rates below 5%.
- Agnes rate-limits **per IP and per domain** (`"Too many registration attempts
  from this IP / this email domain"`), and the limits are sticky for minutes.
- A residential IP is required for a reliable run.

Recommendation: a paid residential proxy (or simply run from a clean
residential/VPS IP with moderate volume). Public free proxy lists are not a
solution to this problem.

## Known limits

- Agnes may change its API; there is no CI to catch it.
- Only `souss.dev` is verified for mail delivery at time of writing.
- Rate limits mean a single IP/domain yields only a few accounts before
  cooling down; plan rotation accordingly.
- Use responsibly and within Agnes' terms of service.

MIT © original author 0xgetz; fixes as noted.
