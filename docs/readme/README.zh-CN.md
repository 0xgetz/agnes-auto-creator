<div align="center">

<img src="../assets/banner.svg" alt="Agnes Auto Creator" width="820">

<br>

**自动创建 Agnes AI 账号与 API 密钥 — 全新邮箱、随机凭据、端到端。**

<br>

[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-3EC6A0?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Playwright](https://img.shields.io/badge/Playwright-1.47.2-39B4C8?style=flat-square&logo=playwright&logoColor=white)](https://playwright.dev)
[![License](https://img.shields.io/badge/License-MIT-2B8FD6?style=flat-square)](../LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-3EC6A0?style=flat-square)](../CHANGELOG.md)
[![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows-2B8FD6?style=flat-square)](#环境要求)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-3EC6A0?style=flat-square)](../CONTRIBUTING.md)

<br>

[English](../README.md) · [Bahasa Indonesia](README.id.md) · [日本語](README.ja.md) · [简体中文](README.zh-CN.md) · [Español](README.es.md)

</div>

---

## ✨ 功能

**Agnes Auto Creator** 可全自动创建 [Agnes AI](https://platform.agnes-ai.com)
账号。每个账号会依次完成：

1. 🎲 生成随机身份 — 邮箱前缀、强密码、姓名。
2. 📧 使用全新的 [zenvex.dev](https://zenvex.dev) 临时邮箱。
3. 🔐 请求并读取 Agnes 的邮箱验证码。
4. ✅ 注册账号。
5. 🔑 登录并创建一个随机命名的 **API 密钥**。

全流程脚本化，可直接在 Ubuntu VPS 上运行。

> **每个账号产出：** 一个 `sk-...` API 密钥及账号凭据，写入本地 JSON 文件。

## 🚀 快速开始

```bash
git clone https://github.com/0xgetz/agnes-auto-creator.git
cd agnes-auto-creator
chmod +x setup.sh
./setup.sh                 # 安装依赖并创建 1 个账号
```

或手动执行：

```bash
npm install
npx playwright install --with-deps chromium
node src/index.mjs -n 3 -o accounts.json
```

## 🖥️ 环境要求

| 项目      | 最低要求                        |
| --------- | ------------------------------- |
| Node.js   | 18+                             |
| 操作系统  | Linux (Ubuntu/Debian)、macOS    |
| 磁盘      | 约 400 MB (Chromium)            |
| 网络      | 可访问 Agnes 与 zenvex 的 HTTPS |

> **为什么需要 Playwright？** Agnes 的 API 本身是纯 HTTPS，无需浏览器。
> 只有 **zenvex.dev** 邮箱受 Cloudflare 反爬保护，会拒绝普通 HTTP 客户端，
> 因此必须通过真实 Chromium 读取。详见
> [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)。

## 🛠️ 用法

```bash
node src/index.mjs [选项]
```

| 选项                 | 默认值                            | 说明                 |
| -------------------- | --------------------------------- | -------------------- |
| `-n, --count N`      | `1`                               | 创建账号数量         |
| `-d, --domain D`     | 从列表中随机                      | zenvex 收件域名      |
| `-o, --out FILE`     | `agnes-accounts-<timestamp>.json` | 输出文件             |
| `-t, --timeout MS`   | `120000`                          | 等待验证邮件的毫秒数 |
| `--concurrency N`    | `1`                               | 并发创建的账号数     |
| `--headful`          | 关闭                              | 显示浏览器（调试）   |
| `-q, --quiet`        | 关闭                              | 仅输出最终汇总       |
| `-h, --help`         | —                                 | 显示帮助             |

### 示例

```bash
# 创建一个账号
node src/index.mjs

# 在指定域名上创建五个账号
node src/index.mjs -n 5 -d znvx.me -o accounts.json

# 创建三个账号，每次两个并发
node src/index.mjs -n 3 --concurrency 2
```

### 作为库使用

```js
import { chromium } from "playwright";
import { provisionOne } from "./src/core/provision.mjs";

const browser = await chromium.launch();
const context = await browser.newContext();
const account = await provisionOne(context, { domain: "souss.dev" });

console.log(account.api_key);
await browser.close();
```

更多见 [`examples/programmatic.mjs`](../examples/programmatic.mjs)。

## 📦 输出格式

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

文件会在**每个账号完成后写入**，因此即使中途崩溃也不会丢失已完成的结果。

## 🗂️ 项目结构

```
src/
  index.mjs            CLI · 参数解析 · 工作池
  core/provision.mjs   单个账号的端到端流程
  agnes/client.mjs     Agnes REST API 客户端
  inbox/zenvex.mjs     zenvex.dev 邮箱读取器 (Playwright)
  utils/random.mjs     随机身份生成器
  utils/logger.mjs     彩色结构化日志
docs/
  ARCHITECTURE.md      工作原理与接口映射
  readme/              翻译 (en, id, ja, es)
  assets/              徽标 · 横幅 · 字标
examples/              库用法示例
```

## ⚠️ 注意事项

- **按域名的频率限制。** 部分临时邮箱域名会收到 Agnes 的
  *"Too many registration attempts from this email domain"*。此时请更换
  `--domain`（例如 `znvx.me`）重试。
- **验证码很快过期。** 脚本会立即读取并提交，因此把 `--timeout` 调到几分钟
  以上没有意义。
- **VPS 上的无头 Chromium** 需要 `--no-sandbox`（已设置）以及
  `npx playwright install --with-deps chromium` 安装的系统库。
- **生成的机密信息。** 输出文件已被 `.gitignore` 忽略，切勿提交。

## 🧭 设计理念

本项目**刻意不包含 CI** — 没有 GitHub Actions、没有 runner、云端没有机密。
你在自己的机器上本地运行，账号就在本地创建。组件更少，无从泄露。

## 🤝 贡献

欢迎贡献！请先阅读 [CONTRIBUTING.md](../CONTRIBUTING.md) 与
[SECURITY.md](../SECURITY.md)。

## 📄 许可证

基于 [MIT 许可证](../LICENSE) 发布 © 0xgetz

<div align="center">
<br>
<sub>与 Agnes AI 或 SapiensAI 无关联。请遵守其服务条款并负责任地使用。</sub>
</div>
