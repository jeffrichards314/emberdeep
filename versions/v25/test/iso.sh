#!/bin/sh
# iso.sh DEST — copy the working tree (js, test, index.html, package.json, versions/v1 and v22 — the baselines of the parity tests) to DEST so a long run can go on there while you keep editing.
#   sh test/iso.sh /private/tmp/ed-final && cd /private/tmp/ed-final && node test/matrix.js --full > /private/tmp/ed-final.log 2>&1 &
# Never edit js/ or test/ in the working tree while a matrix / battery runs FROM the working tree: run it from a copy like this one.
set -e
[ -n "$1" ] || { echo "usage: sh test/iso.sh DEST"; exit 1; }
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
rm -rf "$1" && mkdir -p "$1/versions"
cd "$ROOT" && cp -R js test index.html package.json "$1/" && cp -R versions/v1 versions/v22 "$1/versions/"
echo "$1"
