export function formatSize(bytes: number) {
  let res: string;

  if (bytes >= 1073741824) {
    res = `${(bytes / 1073741824).toFixed(2)} GB`;
  } else if (bytes >= 1048576) {
    res = `${(bytes / 1048576).toFixed(2)} MB`;
  } else if (bytes >= 1024) {
    res = `${(bytes / 1024).toFixed(2)} KB`;
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
