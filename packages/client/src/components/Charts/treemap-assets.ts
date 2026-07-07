type SyncCheckedAssetsOptions = {
  assetNames: string[];
  previousAssetNames: string[];
  checkedAssets: string[];
};

export const syncCheckedAssets = ({
  assetNames,
  previousAssetNames,
  checkedAssets,
}: SyncCheckedAssetsOptions): string[] => {
  const assetNameSet = new Set(assetNames);
  const previousAssetNameSet = new Set(previousAssetNames);
  const checkedAssetSet = new Set(checkedAssets);
  const retainedCheckedAssets = checkedAssets.filter((name) =>
    assetNameSet.has(name),
  );
  const newAssetNames = assetNames.filter(
    (name) => !previousAssetNameSet.has(name) && !checkedAssetSet.has(name),
  );

  if (
    retainedCheckedAssets.length === checkedAssets.length &&
    newAssetNames.length === 0
  ) {
    return checkedAssets;
  }

  return [...retainedCheckedAssets, ...newAssetNames];
};
