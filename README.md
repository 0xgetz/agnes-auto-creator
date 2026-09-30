<div align="center">

<img src="docs/assets/banner.svg" alt="Agnes Auto Creator" width="820">

<br>

**Automated account & API-key provisioning for Agnes AI — fresh email, random credentials, end-to-end.**

<br>

[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-3EC6A0?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Playwright](https://img.shields.io/badge/Playwright-1.47.2-39B4C8?style=flat-square&logo=playwright&logoColor=white)](https://playwright.dev)
[![License](https://img.shields.io/badge/License-MIT-2B8FD6?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-3EC6A0?style=flat-square)](CHANGELOG.md)
[![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows-2B8FD6?style=flat-square)](#requirements)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-3EC6A0?style=flat-square)](CONTRIBUTING.md)
[![No CI](https://img.shields.io/badge/CI-none%20(by%20design)-7C8EA0?style=flat-square)](#philosophy)

<br>

[English](README.md) · [Bahasa Indonesia](docs/readme/README.id.md) · [日本語](docs/readme/README.ja.md) · [简体中文](docs/readme/README.zh-CN.md) · [Español](docs/readme/README.es.md)

</div>

---

## ✨ What it does

**Agnes Auto Creator** provisions [Agnes AI](https://platform.agnes-ai.com)
accounts fully automatically. For every account it:

1. 🎲 Generates a random identity — email local-part, strong password, full name.
2. 📧 Uses a fresh [zenvex.dev](https://zenvex.dev) temporary inbox.
3. 🔐 Requests and reads the Agnes email verification code.
4. ✅ Registers the account.
5. 🔑 Logs in and creates an **API key** with a random name.

Everything is scripted end-to-end and ready to run on an Ubuntu VPS.

> **Result per account:** an `sk-...` API key plus the credentials, written to a
> local JSON file.

## 🚀 Quick start

```bash
git clone https://github.com/0xgetz/agnes-auto-creator.git
cd agnes-auto-creator
chmod +x setup.sh
./setup.sh                 # installs deps + creates 1 account
```

Or manually:

```bash
npm install
npx playwright install --with-deps chromium
node src/index.mjs -n 3 -o accounts.json
```

## 🖥️ Requirements

| Item    | Minimum                          |
| ------- | -------------------------------- |
| Node.js | 18+                              |
| OS      | Linux (Ubuntu/Debian), macOS     |
| Disk    | ~400 MB (Chromium)               |
| Network | outbound HTTPS to Agnes + zenvex |

> **Why Playwright?** The Agnes API itself needs no browser — it is plain HTTPS.
> Only the **zenvex.dev** inbox sits behind a Cloudflare anti-bot layer that
> rejects bare HTTP clients, so it must be read through a real Chromium.
> See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## 🛠️ Usage

```bash
node src/index.mjs [options]
```

| Flag                 | Default                          | Description                        |
| -------------------- | -------------------------------- | ---------------------------------- |
| `-n, --count N`      | `1`                              | number of accounts                 |
| `-d, --domain D`     | random from list                 | zenvex receiving domain            |
| `-o, --out FILE`     | `agnes-accounts-<timestamp>.json`| output file                        |
| `-t, --timeout MS`   | `120000`                         | max wait for the verification mail |
| `--concurrency N`    | `1`                              | accounts created in parallel       |
| `--headful`          | off                              | show the browser (debugging)       |
| `-q, --quiet`        | off                              | print only the final summary       |
| `-h, --help`         | —                                | show help                          |

### Examples

```bash
# create one account
node src/index.mjs

# create five accounts on a specific domain
node src/index.mjs -n 5 -d znvx.me -o accounts.json

# create three accounts, two at a time
node src/index.mjs -n 3 --concurrency 2
```

### Use it as a library

```js
import { chromium } from "playwright";
import { provisionOne } from "./src/core/provision.mjs";

const browser = await chromium.launch();
const context = await browser.newContext();
const account = await provisionOne(context, { domain: "souss.dev" });

console.log(account.api_key);
await browser.close();
```

More in [`examples/programmatic.mjs`](examples/programmatic.mjs).

## 📦 Output format

```json
[
  {
    "ok": true,
    "email": "swiftfox482913@souss.dev",
    "password": "Xk7!mQ2vPz9rLt4w",
    "full_name": "Putri Maharani",
    "email_provider": "zenvex.dev (souss.dev)",
    "api_key_name": "prod-token-7421",
    "api_key": "sk-................................",
    "user_id": 995419,
    "user_display_id": "20260927133451462",
    "elapsed_ms": 21430,
    "created_at": "2026-09-30T13:36:01.000Z"
  }
]
```

The file is written **after every account**, so finished work survives a crash.

## 🗂️ Project layout

```
src/
  index.mjs            CLI · arg parsing · worker pool
  core/provision.mjs   end-to-end flow for one account
  agnes/client.mjs     Agnes REST API client
  inbox/zenvex.mjs     zenvex.dev inbox reader (Playwright)
  utils/random.mjs     random identity generators
  utils/logger.mjs     coloured structured logger
docs/
  ARCHITECTURE.md      how it works, endpoint map
  readme/              translations (id, ja, zh-CN, es)
  assets/              logo · banner · wordmark
examples/              library usage
```

## ⚠️ Notes & gotchas

- **Per-domain rate limits.** Agnes may reply *"Too many registration attempts
  from this email domain"* for some temp-mail domains. If that happens, retry
  with a different `--domain` (e.g. `znvx.me`).
- **Codes expire quickly.** The script reads and submits the code immediately;
  raising `--timeout` beyond a few minutes gains nothing.
- **Headless Chromium on a VPS** needs `--no-sandbox` (already set) and the OS
  libraries from `npx playwright install --with-deps chromium`.
- **Generated secrets.** Output files are git-ignored. Never commit them.

## 🧭 Philosophy

This project ships **without CI on purpose** — no GitHub Actions, no runners, no
secrets in the cloud. You run it locally, on your own machine, where the accounts
are created. Fewer moving parts, nothing to leak.

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) and
[SECURITY.md](SECURITY.md) first.

## 📄 License

Released under the [MIT License](LICENSE) © 0xgetz

<div align="center">
<br>
<sub>Not affiliated with Agnes AI or SapiensAI. Use responsibly and in line with their terms of service.</sub>
</div>
