import { SDK } from '@rsdoctor/types';

const COMPRESSIBLE_REGEX =
  /\.(?:js|css|html|json|svg|txt|xml|xhtml|wasm|manifest)$/i;

export function assetsContents(
  assetMap: Map<string, { content: string }>,
  chunkGraph: SDK.ChunkGraphInstance,
  supports: SDK.ISupport,
) {
  const assets = chunkGraph.getAssets();
  assets.forEach((asset) => {
    const { content = '' } = assetMap.get(asset.path) || {};
    asset.content = content;
    if (COMPRESSIBLE_REGEX.test(asset.path) && supports?.gzip) {
      asset.setGzipSize(content);
    }
  });
}
