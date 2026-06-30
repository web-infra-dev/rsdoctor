import path from 'path-browserify';

const { dirname, isAbsolute, join, relative } = path;

export const WINDOWS_ABSOLUTE_PATH_REGEXP = /^(?:[a-zA-Z]:[\\/]|\\\\)/;

export const isWindowsPath = (file: string) => {
  return WINDOWS_ABSOLUTE_PATH_REGEXP.test(file) || file.includes('\\');
};

const normalizeWindowsPath = (file: string) => {
  return file.replace(/\//g, '\\').replace(/\\+$/, '');
};

const dirnameWin32 = (file: string) => {
  const normalized = normalizeWindowsPath(file);

  if (/^[a-zA-Z]:$/.test(normalized)) {
    return `${normalized}\\`;
  }

  const uncRoot = normalized.match(/^\\\\[^\\]+\\[^\\]+/);
  if (uncRoot && normalized.length === uncRoot[0].length) {
    return `${uncRoot[0]}\\`;
  }

  const index = normalized.lastIndexOf('\\');

  if (index === -1) {
    return '.';
  }

  if (index === 0) {
    return '\\';
  }

  if (/^[a-zA-Z]:\\/.test(normalized) && index === 2) {
    return normalized.slice(0, 3);
  }

  return normalized.slice(0, index);
};

const joinWin32 = (base: string, file: string) => {
  return `${base.replace(/[\\/]+$/, '')}\\${file}`;
};

const splitWindowsPath = (file: string) => {
  const normalized = normalizeWindowsPath(file);
  const driveRoot = normalized.match(/^[a-zA-Z]:\\/);
  const uncRoot = normalized.match(/^\\\\[^\\]+\\[^\\]+\\/);
  const root = driveRoot?.[0] ?? uncRoot?.[0] ?? '';
  const rest = root ? normalized.slice(root.length) : normalized;

  return {
    root: root.toLowerCase(),
    parts: rest.split('\\').filter(Boolean),
  };
};

const relativeWin32 = (from: string, to: string) => {
  const fromPath = splitWindowsPath(from);
  const toPath = splitWindowsPath(to);

  if (fromPath.root !== toPath.root) {
    return normalizeWindowsPath(to);
  }

  let index = 0;
  while (
    fromPath.parts[index]?.toLowerCase() === toPath.parts[index]?.toLowerCase()
  ) {
    index++;
  }

  return [
    ...fromPath.parts.slice(index).map(() => '..'),
    ...toPath.parts.slice(index),
  ].join('\\');
};

export const isAbsolutePath = (file: string) => {
  return isAbsolute(file) || WINDOWS_ABSOLUTE_PATH_REGEXP.test(file);
};

export const dirnameByPathType = (file: string) => {
  return isWindowsPath(file) ? dirnameWin32(file) : dirname(file);
};

export const joinByPathType = (base: string, file: string) => {
  return isWindowsPath(base) ? joinWin32(base, file) : join(base, file);
};

export const relativeByPathType = (from: string, to: string) => {
  return isWindowsPath(from) || isWindowsPath(to)
    ? relativeWin32(from, to)
    : relative(from, to);
};
