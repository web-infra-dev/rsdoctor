export function formatSize(bytes: number) {
  let res: string;

  if (bytes >= 1000000000) {
    res = `${(bytes / 1000000000).toFixed(2)} GB`;
  } else if (bytes >= 1000000) {
    res = `${(bytes / 1000000).toFixed(2)} MB`;
  } else if (bytes >= 1000) {
    res = `${(bytes / 1000).toFixed(2)} KB`;
  } else if (bytes > 1) {
    res = `${bytes} bytes`;
  } else if (bytes === 1) {
    res = `${bytes} byte`;
  } else {
    res = '0 bytes';
  }
  return res;
}

export function formatPercent(percent: number) {
  return `${+percent.toFixed(2)}%`;
}
