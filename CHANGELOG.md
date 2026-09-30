# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-09-30

### Added
- End-to-end account provisioning for Agnes AI:
  fresh temporary email → verification code → register → login → API key.
- `src/index.mjs` CLI with `--count`, `--domain`, `--out`, `--timeout`,
  `--concurrency`, `--headful`, `--quiet`.
- Modular source layout (`core/`, `agnes/`, `inbox/`, `utils/`).
- Cryptographically random identity generation (name, email, password, key name).
- Incremental JSON output so finished accounts survive a crash.
- Colourful structured logger with TTY detection.
- Documentation in 5 languages (English, Indonesian, Japanese, Chinese, Spanish).
- Brand assets: logo, banner and wordmark (SVG).
- `setup.sh` one-shot installer for Ubuntu VPS.
