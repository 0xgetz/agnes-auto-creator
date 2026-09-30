#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Agnes Auto Creator — one-shot setup for Ubuntu / Debian VPS.
#
#   chmod +x setup.sh
#   ./setup.sh                # create 1 account
#   ./setup.sh -n 5           # create 5 accounts
#   ./setup.sh -n 3 --headful # visible browser (debugging)
# ---------------------------------------------------------------------------
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

echo "==> checking Node.js"
if ! command -v node >/dev/null 2>&1; then
  echo "    Node.js not found — installing Node 20 via NodeSource"
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "    node $(node -v)  npm $(npm -v)"

echo "==> installing npm dependencies"
npm install

echo "==> installing Chromium (+ OS libraries)"
npx playwright install --with-deps chromium

echo "==> running Agnes Auto Creator"
node src/index.mjs "$@"
