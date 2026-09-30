# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 1.x     | ✅        |

## Reporting a vulnerability

Please **do not** open a public issue for security problems. Instead, report it
privately via GitHub's [Security Advisories](https://github.com/0xgetz/agnes-auto-creator/security/advisories/new)
or email the maintainer.

Include:
- a description of the issue and its impact,
- steps to reproduce,
- any suggested fix.

You can expect an acknowledgement within 72 hours.

## Secrets

This tool creates real accounts and API keys. Generated credentials are written
to a local JSON file that is **git-ignored by default** (`.gitignore`). Never
commit:
- `agnes-accounts-*.json` or any output file,
- `.env` files,
- API keys or passwords in issues, PRs or logs.

If you accidentally commit a secret, revoke the key immediately in the Agnes
dashboard and rewrite the affected Git history.
