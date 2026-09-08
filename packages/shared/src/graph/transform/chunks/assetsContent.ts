import { SDK, Plugin } from '../../../types';
import { getBrotliSize } from '../../../common/brotli';

const COMPRESSIBLE_REGEX =
  /\.(?:js|css|html|json|svg|txt|xml|xhtml|wasm|manifest)$/i;

export function assetsContents(
  assetMap: Map<string, { content: string }>,
  chunkGraph: SDK.ChunkGraphInstance,
  gzip: Plugin.NormalizedGzipConfig,
  brotli: Plugin.NormalizedBrotliConfig = false,
) {
  const assets = chunkGraph.getAssets();
  assets.forEach((asset) => {
    const { content = '' } = assetMap.get(asset.path) || {};
    asset.content = content;
    if (content.length > 0 && asset.size === 0) {
      asset.size = Buffer.byteLength(content, 'utf8');
    }
    asset.brotliSize =
      brotli !== false && COMPRESSIBLE_REGEX.test(asset.path)
        ? getBrotliSize(content, brotli.brotliLevel)
        : undefined;
    if (gzip === false) {
      asset.gzipSize = undefined;
    } else if (COMPRESSIBLE_REGEX.test(asset.path)) {
      asset.setGzipSize(content, gzip.gzipLevel);
    }
  });
}
