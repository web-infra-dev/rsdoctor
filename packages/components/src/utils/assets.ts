const JAVASCRIPT_ASSET_EXTENSIONS = new Set([
  'js',
  'cjs',
  'mjs',
  'jsx',
  'bundle',
]);

export const isJavaScriptAsset = (assetPath: string): boolean => {
  const cleanPath = assetPath.split(/[?#]/, 1)[0] ?? '';
  const lastDot = cleanPath.lastIndexOf('.');

  if (lastDot === -1) return false;

  const ext = cleanPath.slice(lastDot + 1).toLowerCase();
  return JAVASCRIPT_ASSET_EXTENSIONS.has(ext);
};
