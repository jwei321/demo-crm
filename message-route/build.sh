#!/bin/sh
# One command: events → picture → mix → master. Output: there-and-back.mp4 (−14 LUFS) + poster.jpg
set -e
LIB=/root/lemo-opuscar
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB_OVERRIDE:-$LIB}; export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB_OVERRIDE to the library folder"; exit 1; }
cd "$LIB"
node core/render/events.mjs "$HERE"
node core/render/readcheck.mjs "$HERE"
node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$HERE/out/video.mp4"
"$LIB/.venv/bin/python" "$HERE/mix.py"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/there-and-back.mp4" 24 0
ffmpeg -loglevel error -y -ss 6.9 -i "$HERE/there-and-back.mp4" -frames:v 1 -q:v 2 "$HERE/poster.jpg"
