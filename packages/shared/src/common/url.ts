import path from 'path-browserify';

const { isAbsolute } = path;

const WINDOWS_ABSOLUTE_PATH_REGEXP = /^(?:[a-zA-Z]:[\\/]|\\\\)/;

export function isUrl(uri: string) {
  return /^https?:\/\//.test(uri);
}

export function isFilePath(uri: string) {
  return isAbsolute(uri) || WINDOWS_ABSOLUTE_PATH_REGEXP.test(uri);
}

export function isRemoteUrl(uri: unknown) {
  if (typeof uri === 'string') {
    if (isUrl(uri) || isFilePath(uri)) {
      return true;
    }
  }

  return false;
}
