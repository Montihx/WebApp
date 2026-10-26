#!/usr/bin/env bash
# UI-аудит Kitsu: иконки без рамок, без круглых форм, наведение, эмодзи, вёрстка 320–1920 px, контраст.
# Нужны: python3 + playwright (pip install playwright && playwright install chromium).
set -euo pipefail
cd "$(dirname "$0")/../.."
python3 -m http.server 4173 --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER' EXIT
sleep 1
cd tools/ui-audit
for s in iconaudit iconaudit2 pillaudit hoveraudit emojiaudit contrastaudit; do echo "== $s"; python3 "$s.py"; done
echo "== layoutaudit"; python3 layoutaudit.py
