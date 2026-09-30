# Architecture

A short tour of how Agnes Auto Creator is put together.

## Flow

```
              ┌───────────────────────────────────────────────┐
              │                  CLI (src/index.mjs)          │
              │  parse args · worker pool · incremental JSON  │
              └───────────────────────┬───────────────────────┘
                                      │ provisionOne()
                                      ▼
        ┌───────────────────────────────────────────────────────────┐
        │                Core flow (src/core/provision.mjs)         │
        └───────┬───────────────┬───────────────┬───────────────────┘
                │               │               │
                ▼               ▼               ▼
      ┌─────────────────┐ ┌─────────────┐ ┌──────────────────┐
      │  utils/random   │ │ agnes/      │ │ inbox/zenvex     │
      │  identity gen   │ │ client.mjs  │ │ .mjs (Playwright)│
      └─────────────────┘ └──────┬──────┘ └────────┬─────────┘
                                 │                 │
                                 ▼                 ▼
                     platform-backend.agnes-ai.com  zenvex.dev
                       (plain HTTPS JSON API)       (Cloudflare-gated)
```

## Why a browser at all?

The Agnes backend is a normal JSON API and needs **no browser**. The only
component that requires a real Chromium is the **zenvex.dev** inbox, because it
sits behind a Cloudflare anti-bot layer that rejects bare HTTP clients.

We therefore open **one** Chromium and use it two ways:

- `context.request` (Playwright's `APIRequestContext`) performs every Agnes call.
  It is a real HTTP client, so it is *not* subject to browser CORS and keeps a
  browser-like TLS fingerprint.
- a single `page` reads the verification email from zenvex.

## Verification-code extraction

zenvex renders the email body as *escaped* HTML inside the page, so the code can
look like:

```html
<div class=&quot;verification-code&quot;&gt;797935&lt;/div&gt;
```

`extractCode()` first tries the `.verification-code` block (escaped or not) and
falls back to any 6-digit run, excluding known static numbers on the landing
page. See `src/inbox/zenvex.mjs`.

## Concurrency & resilience

- `src/index.mjs` runs a fixed-size worker pool (`--concurrency`), so at most N
  pages exist at once.
- Results are written to the output file **after every account**, so a crash or
  rate-limit never loses finished work.
- Each account is independent; one failure does not stop the batch.

## Endpoints used

| Step            | Method | Path                                             | Body |
| --------------- | ------ | ------------------------------------------------ | ---- |
| Request code    | GET    | `/api/verification?email=<e>&purpose=register`   | — |
| Register        | POST   | `/api/user/register`                             | `{email,password,password_confirm,code}` |
| Login           | POST   | `/api/user/login`                                | `{username,password}` → `data.access_token` |
| Create API key  | POST   | `/api/token`                                     | `{name,api_key_profile}` → `data.key` |

Base URL: `https://platform-backend.agnes-ai.com`
Auth: `Authorization: Bearer <access_token>`.
