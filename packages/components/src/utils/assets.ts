const JAVASCRIPT_ASSET_EXTENSIONS = new Set([
  'js',
  'cjs',
  'mjs',
  'jsx',
  'bundle',
]);

export const isJavaScriptAsset = (assetPath: string) => {
  const ext = assetPath.toLowerCase().split('.').pop() || '';
  return JAVASCRIPT_ASSET_EXTENSIONS.has(ext);
};
