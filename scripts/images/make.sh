#!/usr/bin/env bash
# Rebuild the link preview and home-screen icons in public/ from the sources here.
# Needs rsvg-convert (brew install librsvg) and Google Chrome.
set -euo pipefail
cd "$(dirname "$0")"
OUT=../../public
CHROME=${CHROME:-"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}

for size in 180 192 512; do
  rsvg-convert -w "$size" -h "$size" icon.svg -o "$OUT/icon-$size.png"
done
mv "$OUT/icon-180.png" "$OUT/apple-touch-icon.png"

profile=$(mktemp -d)
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$profile" \
  --force-device-scale-factor=1 --window-size=1200,630 --virtual-time-budget=8000 \
  --screenshot="$PWD/$OUT/og.png" "file://$PWD/og.html" 2>/dev/null
rm -rf "$profile"
echo "wrote apple-touch-icon.png, icon-192.png, icon-512.png and og.png to public/"
