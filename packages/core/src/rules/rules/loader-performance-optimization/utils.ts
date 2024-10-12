export function match(str: string, patterns: (string | RegExp)[]) {
  if (patterns.length === 0) return false;

  return patterns.some((p) => {
    if (typeof p === 'string') return str === p;
    if (p instanceof RegExp) return p.test(str);
    return false;
  });
}
