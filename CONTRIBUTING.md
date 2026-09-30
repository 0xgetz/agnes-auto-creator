# Contributing to Agnes Auto Creator

Thanks for taking the time to contribute! 🎉

## Code of conduct

Be respectful, constructive and patient. Harassment or abusive behaviour will
not be tolerated.

## How to contribute

1. **Fork** the repository and create your branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```
2. **Install** dependencies:
   ```bash
   npm install
   npx playwright install chromium
   ```
3. **Make your change.** Keep the style consistent with the existing code:
   - ES modules (`.mjs`), no TypeScript build step
   - 2-space indentation, semicolons, double quotes
   - JSDoc on every exported function
4. **Test manually** against the live flow before opening a PR:
   ```bash
   node src/index.mjs -n 1 --headful
   ```
5. **Commit** using [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   feat: add --key-profile flag
   fix: handle expired verification code
   docs: translate README to Japanese
   ```
6. **Open a Pull Request** and fill in the template.

## Project layout

```
src/
  index.mjs            CLI entry point, arg parsing, worker pool
  core/provision.mjs   end-to-end flow for one account
  agnes/client.mjs     Agnes REST API client
  inbox/zenvex.mjs     zenvex.dev inbox reader (Playwright)
  utils/random.mjs     random identity generators
  utils/logger.mjs     coloured structured logger
docs/
  readme/              translations (en, id, ja, zh-CN, es)
  assets/              logo, banner, wordmark
```

## Adding a new language

1. Copy `README.md` to `docs/readme/README.<lang>.md`.
2. Translate the prose; keep code blocks, URLs and badges unchanged.
3. Add a language link at the top of every README.

## Reporting bugs

Open an issue with:
- what you ran (exact command),
- what you expected,
- what happened (full log),
- your OS + `node -v`.

**Never paste real API keys or account passwords** in an issue.
