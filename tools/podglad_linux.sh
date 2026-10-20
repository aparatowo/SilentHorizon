#!/usr/bin/env bash
# Podgląd z obsługą Bluetooth LE w Chrome na Linuksie.
# Chrome na Linuksie ma Web Bluetooth domyślnie wyłączony - ten skrypt uruchamia
# osobne okno Chrome (własny profil) z włączonym Bluetooth i lokalny serwer aplikacji.
#
#   tools/podglad_linux.sh            # strona podglądu
#   tools/podglad_linux.sh index.html # strona testów

set -euo pipefail
APP_DIR="$(cd "$(dirname "$0")/../app" && pwd)"
PORT=8000
PAGE="${1:-viewer.html}"

if ! curl -s -o /dev/null "http://localhost:$PORT/"; then
  python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$APP_DIR" >/dev/null 2>&1 &
  sleep 1
fi

google-chrome \
  --user-data-dir="$HOME/.config/silenthorizon-chrome" \
  --enable-features=WebBluetooth \
  --no-first-run --no-default-browser-check \
  "http://localhost:$PORT/$PAGE" >/dev/null 2>&1 &
