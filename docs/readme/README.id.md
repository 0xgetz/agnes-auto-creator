<div align="center">

<img src="../assets/banner.svg" alt="Agnes Auto Creator" width="820">

<br>

**Pembuatan akun & API key Agnes AI secara otomatis — email baru, kredensial acak, end-to-end.**

<br>

[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-3EC6A0?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Playwright](https://img.shields.io/badge/Playwright-1.47.2-39B4C8?style=flat-square&logo=playwright&logoColor=white)](https://playwright.dev)
[![License](https://img.shields.io/badge/License-MIT-2B8FD6?style=flat-square)](../LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-3EC6A0?style=flat-square)](../CHANGELOG.md)
[![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows-2B8FD6?style=flat-square)](#kebutuhan)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-3EC6A0?style=flat-square)](../CONTRIBUTING.md)

<br>

[English](../README.md) · [Bahasa Indonesia](README.id.md) · [日本語](README.ja.md) · [简体中文](README.zh-CN.md) · [Español](README.es.md)

</div>

---

## ✨ Fitur

**Agnes Auto Creator** membuat akun [Agnes AI](https://platform.agnes-ai.com)
sepenuhnya otomatis. Untuk setiap akun, script akan:

1. 🎲 Membuat identitas acak — email, password kuat, dan nama lengkap.
2. 📧 Memakai inbox sementara [zenvex.dev](https://zenvex.dev) yang baru.
3. 🔐 Meminta dan membaca kode verifikasi email dari Agnes.
4. ✅ Mendaftarkan akun.
5. 🔑 Login lalu membuat **API key** dengan nama acak.

Semuanya berjalan otomatis dan siap dijalankan di VPS Ubuntu.

> **Hasil per akun:** satu API key `sk-...` beserta kredensialnya, tersimpan di
> file JSON lokal.

## 🚀 Cara cepat

```bash
git clone https://github.com/0xgetz/agnes-auto-creator.git
cd agnes-auto-creator
chmod +x setup.sh
./setup.sh                 # install dependensi + buat 1 akun
```

Atau manual:

```bash
npm install
npx playwright install --with-deps chromium
node src/index.mjs -n 3 -o accounts.json
```

## 🖥️ Kebutuhan

| Item    | Minimal                       |
| ------- | ----------------------------- |
| Node.js | 18+                           |
| OS      | Linux (Ubuntu/Debian), macOS  |
| Disk    | ~400 MB (Chromium)            |
| Jaringan| HTTPS keluar ke Agnes + zenvex|

> **Kenapa Playwright?** API Agnes sendiri tidak butuh browser — murni HTTPS.
> Hanya inbox **zenvex.dev** yang dilindungi anti-bot Cloudflare dan menolak
> klien HTTP biasa, jadi harus dibaca lewat Chromium asli.
> Lihat [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md).

## 🛠️ Penggunaan

```bash
node src/index.mjs [opsi]
```

| Opsi                 | Default                           | Keterangan                        |
| -------------------- | --------------------------------- | --------------------------------- |
| `-n, --count N`      | `1`                               | jumlah akun                       |
| `-d, --domain D`     | acak dari daftar                  | domain inbox zenvex               |
| `-o, --out FILE`     | `agnes-accounts-<timestamp>.json` | file output                       |
| `-t, --timeout MS`   | `120000`                          | waktu tunggu email verifikasi     |
| `--concurrency N`    | `1`                               | jumlah akun paralel               |
| `--headful`          | mati                              | tampilkan browser (debug)         |
| `-q, --quiet`        | mati                              | hanya tampilkan ringkasan akhir   |
| `-h, --help`         | —                                 | tampilkan bantuan                 |

### Contoh

```bash
# buat satu akun
node src/index.mjs

# buat lima akun di domain tertentu
node src/index.mjs -n 5 -d znvx.me -o accounts.json

# buat tiga akun, dua sekaligus
node src/index.mjs -n 3 --concurrency 2
```

### Pakai sebagai library

```js
import { chromium } from "playwright";
import { provisionOne } from "./src/core/provision.mjs";

const browser = await chromium.launch();
const context = await browser.newContext();
const account = await provisionOne(context, { domain: "souss.dev" });

console.log(account.api_key);
await browser.close();
```

Selengkapnya di [`examples/programmatic.mjs`](../examples/programmatic.mjs).

## 📦 Format output

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

File ditulis **setiap selesai satu akun**, jadi hasil yang sudah jadi tidak
hilang kalau script berhenti.

## 🗂️ Struktur proyek

```
src/
  index.mjs            CLI · parsing argumen · worker pool
  core/provision.mjs   alur end-to-end untuk satu akun
  agnes/client.mjs     klien REST API Agnes
  inbox/zenvex.mjs     pembaca inbox zenvex.dev (Playwright)
  utils/random.mjs     generator identitas acak
  utils/logger.mjs     logger berwarna
docs/
  ARCHITECTURE.md      cara kerja & peta endpoint
  readme/              terjemahan (en, ja, zh-CN, es)
  assets/              logo · banner · wordmark
examples/              contoh pemakaian library
```

## ⚠️ Catatan penting

- **Batas per domain.** Agnes bisa membalas *"Too many registration attempts
  from this email domain"* untuk sebagian domain temp-mail. Jika terjadi, coba
  `--domain` lain (mis. `znvx.me`).
- **Kode cepat kedaluwarsa.** Script membaca dan mengirim kode langsung; menaikkan
  `--timeout` lebih dari beberapa menit tidak ada gunanya.
- **Chromium headless di VPS** butuh `--no-sandbox` (sudah diatur) dan library OS
  dari `npx playwright install --with-deps chromium`.
- **Rahasia yang dihasilkan.** File output sudah masuk `.gitignore`. Jangan pernah
  di-commit.

## 🧭 Filosofi

Proyek ini sengaja **tanpa CI** — tidak ada GitHub Actions, runner, atau rahasia
di cloud. Anda menjalankannya secara lokal di mesin sendiri. Lebih sedikit bagian
yang bergerak, tidak ada yang bisa bocor.

## 🤝 Kontribusi

Kontribusi sangat diterima! Baca [CONTRIBUTING.md](../CONTRIBUTING.md) dan
[SECURITY.md](../SECURITY.md) terlebih dahulu.

## 📄 Lisensi

Dirilis di bawah [Lisensi MIT](../LICENSE) © 0xgetz

<div align="center">
<br>
<sub>Tidak berafiliasi dengan Agnes AI atau SapiensAI. Gunakan secara bertanggung jawab sesuai ketentuan layanan mereka.</sub>
</div>
