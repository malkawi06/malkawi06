#!/bin/bash
# SessionStart hook: prepares the portfolio site toolchain in Claude Code on the web.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

# Site dependencies (Vite, Three.js, TypeScript).
if [ -f "$ROOT/site/package.json" ]; then
  (cd "$ROOT/site" && npm install --no-audit --no-fund --loglevel=error)
fi

# playwright-cli, used by the playwright-cli skill to open and screenshot the site.
if ! command -v playwright-cli >/dev/null 2>&1; then
  npm install -g @playwright/cli@latest --no-audit --no-fund --loglevel=error
fi

# Point playwright-cli at the pre-installed Chromium instead of downloading Chrome.
CHROME="$(ls -d /opt/pw-browsers/chromium-*/chrome-linux*/chrome 2>/dev/null | sort -V | tail -1 || true)"
if [ -n "$CHROME" ]; then
  mkdir -p "$ROOT/.playwright"
  cat > "$ROOT/.playwright/cli.config.json" <<JSON
{
  "browser": {
    "browserName": "chromium",
    "launchOptions": {
      "executablePath": "$CHROME",
      "args": ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
    }
  }
}
JSON
fi
