const moduleHashPattern = /[a-fA-F0-9]{20,}/;
const moduleHashSuffixPattern = /\|[a-fA-F0-9]{16,}$/;

export function getModuleDiffKey(module: {
  webpackId?: string;
  path?: string;
}): string {
  const normalize = (value: string | undefined) =>
    value
      ?.replace(moduleHashSuffixPattern, '')
      .replace(moduleHashPattern, '') || '';

  return normalize(module.webpackId) || normalize(module.path);
}
