const moduleHashPattern = /[a-fA-F0-9]{20,}/;
const moduleHashSuffixPattern = /\|[a-fA-F0-9]{16,}$/;

export function getModuleDiffKey(module: {
  identifier?: string;
  path?: string;
}): string {
  const normalize = (value: string | undefined) =>
    value
      ?.replace(moduleHashSuffixPattern, '')
      .replace(moduleHashPattern, '') || '';

  return normalize(module.identifier) || normalize(module.path);
}
