const moduleHashPattern = /[a-fA-F0-9]{20,}/;
const moduleHashSuffixPattern = /\|[a-fA-F0-9]{16,}$/;

export function getModuleDiffKey(module: {
  identifier?: string;
  path?: string;
}): string {
  const identifier = module.identifier || module.path || '';

  return identifier
    .replace(moduleHashSuffixPattern, '')
    .replace(moduleHashPattern, '');
}
