import { SDK } from '@rsdoctor/types';

export function assetsContents(
  assetMap: Map<string, { content: string }>,
  chunkGraph: SDK.ChunkGraphInstance,
) {
  const assets = chunkGraph.getAssets();
  assets.forEach((asset) => {
    const { content = '' } = assetMap.get(asset.path) || {};
    asset.content = content;
  });
}
