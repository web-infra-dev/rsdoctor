#!/bin/bash
set -e

echo "🚀 Starting build script..."

dir=`dirname $0`
rootdir=$(cd $dir && pwd)
outdir="$rootdir"/doc_build

echo "📁 Working directory: $rootdir"
echo "📁 Output directory: $outdir"

# copy client/dist
echo "📦 Copying client/dist to preview folder..."
mkdir -p "${outdir}/preview"
client_dist_path="$(cd $dir && cd ../../ && pwd)/packages/client/dist"
echo "📂 Source path: $client_dist_path"

if [ -d "$client_dist_path" ]; then
  echo "✅ Client dist directory exists"
  cp -rf "$client_dist_path/"* "${outdir}/preview/"
  echo "✅ Successfully copied client files to preview folder"
  
  # Show what was copied
  echo "📋 Preview folder contents:"
  ls -la "${outdir}/preview/"

  echo "🎉 Build script completed successfully!"
else
  echo "❌ Error: Client dist directory not found at $client_dist_path"
fi



