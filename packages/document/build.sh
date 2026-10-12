#!/bin/sh
set -eu

rootdir=$(cd "$(dirname "$0")" && pwd)
repo_root=$(cd "$rootdir/../.." && pwd)
client_dir="$repo_root/packages/client"
preview_dir="$rootdir/doc_build/preview"

(cd "$client_dir" && RSDOCTOR_PREVIEW_ONLY=true node "$repo_root/node_modules/rstack/bin/rs.js" build)

rm -rf "$preview_dir"
mkdir -p "$preview_dir"
cp -R "$client_dir/dist-preview/." "$preview_dir/"
