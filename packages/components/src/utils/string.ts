export function ensurePrefix(str: string, prefix: string): string {
  return str.slice(0, prefix.length) === prefix ? str : `${str}${prefix}`;
}

export function removePrefix(str: string, prefix: string): string {
  let res = str;

  while (res.slice(0, prefix.length) === prefix) {
    res = res.slice(prefix.length);
  }

  return res;
}

export function truncateMiddle(text: string, maxLength = 60): string {
  if (text.length <= maxLength) return text;
  const half = Math.floor((maxLength - 3) / 2);
  return `${text.slice(0, half)}...${text.slice(-half)}`;
}
