import { SDK, Plugin } from '@rsdoctor/types';

const COMPRESSIBLE_REGEX =
  /\.(?:js|css|html|json|svg|txt|xml|xhtml|wasm|manifest)$/i;

export function assetsContents(
  assetMap: Map<string, { content: string }>,
  chunkGraph: SDK.ChunkGraphInstance,
  supports: Plugin.RsdoctorPluginOptionsNormalized['supports'],
) {
  const assets = chunkGraph.getAssets();
  assets.forEach((asset) => {
    const { content = '' } = assetMap.get(asset.path) || {};
    asset.content = content;
    if (content.length > 0 && asset.size === 0) {
      asset.size = Buffer.byteLength(content, 'utf8');
    }
    if (COMPRESSIBLE_REGEX.test(asset.path) && supports?.gzip) {
      asset.setGzipSize(content);
    }
  });
}
