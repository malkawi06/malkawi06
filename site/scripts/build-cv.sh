#!/bin/bash
# Prints cv/cv.html to public/Mohammad-H-Malkawi-CV.pdf with headless Chromium.
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="${CHROME:-$(ls -d /opt/pw-browsers/chromium-*/chrome-linux*/chrome 2>/dev/null | sort -V | tail -1 || true)}"
CHROME="${CHROME:-$(command -v chromium || command -v google-chrome || true)}"
if [ -z "$CHROME" ]; then
  echo "No Chromium found. Set CHROME=/path/to/chrome." >&2
  exit 1
fi
"$CHROME" --headless --no-sandbox --disable-gpu --no-pdf-header-footer \
  --run-all-compositor-stages-before-draw --virtual-time-budget=4000 \
  --print-to-pdf="$PWD/public/Mohammad-H-Malkawi-CV.pdf" "file://$PWD/cv/cv.html" 2>/dev/null
echo "Wrote public/Mohammad-H-Malkawi-CV.pdf"
