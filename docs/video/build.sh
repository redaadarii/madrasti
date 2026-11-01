#!/usr/bin/env bash
# Génère madrasti-presentation.mp4 à la racine : diapositives (Chromium), narration (voix macOS), montage (AVFoundation).
# Prérequis : macOS, Node (Playwright installé par npm install), captures dans docs/screenshots.
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
build="$root/docs/video/build"
rm -rf "$build" && mkdir -p "$build"
node "$root/docs/video/render-slides.mjs" "$build"
for txt in "$build"/slide-*.txt; do
  say -v "${MADRASTI_VOICE:-Thomas}" -r 175 -o "${txt%.txt}.aiff" -f "$txt"
  afconvert -f m4af -d aac "${txt%.txt}.aiff" "${txt%.txt}.m4a"
done
swift "$root/docs/video/assemble.swift" "$build" "$root/madrasti-presentation.mp4"
