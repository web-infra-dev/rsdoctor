#!/bin/bash
set -e

echo "🚀 Starting build script..."

dir=`dirname $0`
rootdir=$(cd $dir && pwd)
outdir="$rootdir"/doc_build
workspacedir=$(cd "$rootdir"/../.. && pwd)

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

echo "📊 Building Rsdoctor example data..."
CI=true RSDOCTOR_OUTPUT=json pnpm --dir "$workspacedir/examples/rspack-minimal" run build:analysis
CI=true RSDOCTOR_OUTPUT=json pnpm --dir "$workspacedir/examples/rsbuild-minimal" run build:analysis

echo "📦 Adding example data to documentation output..."
mkdir -p "$outdir/examples/rspack-minimal"
mkdir -p "$outdir/examples/rsbuild-minimal"
cp "$workspacedir/examples/rspack-minimal/rsdoctor-data.json" "$outdir/examples/rspack-minimal/rsdoctor-data.json"
cp "$workspacedir/examples/rsbuild-minimal/dist/rsdoctor-data.json" "$outdir/examples/rsbuild-minimal/rsdoctor-data.json"
