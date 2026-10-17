#!/bin/sh
# Freeze the current game as a runnable copy:  ./snapshot.sh v3   ->  versions/v3/index.html (open it directly)
# v1 is the original game and is also what the parity test compares "all packs off" against — never overwrite it.
set -e
name="$1"; [ -n "$name" ] || { echo "usage: ./snapshot.sh <name>"; exit 1; }
[ "$name" = "v1" ] && [ -d versions/v1 ] && { echo "versions/v1 is the frozen original; refusing to overwrite"; exit 1; }
cd "$(dirname "$0")"
rm -rf "versions/$name" && mkdir -p "versions/$name"
cp -R index.html js test serve.py README.md package.json "versions/$name/"
echo "snapshot saved: versions/$name  (open versions/$name/index.html)"
