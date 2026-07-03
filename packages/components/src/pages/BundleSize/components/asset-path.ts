export const normalizeAssetPath = (assetPath: string) =>
  assetPath.replace(/\\/g, '/');

export const createAssetPathMap = <T extends { path: string }>(assets: T[]) =>
  new Map(assets.map((asset) => [normalizeAssetPath(asset.path), asset]));

export const resolveAssetFileTitleTarget = <T extends { path: string }>(
  assetsMap: Map<string, T>,
  file: string,
  basename: string,
) => assetsMap.get(normalizeAssetPath(file)) ?? basename;
