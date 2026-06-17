export function isStyleExt(path: string) {
  return /\.(c|le|sa|sc)ss(\?.*)?$/.test(path);
}

export function isJsExt(path: string) {
  return /\.(js|ts|jsx|tsx)(\?.*)?$/.test(path);
}
