import { SDK } from '@rsdoctor/types';
import { compact, isEmpty, last } from 'es-toolkit/compat';
import path from 'path-browserify';

const { dirname, join } = path;

const WINDOWS_ABSOLUTE_PATH_REGEXP = /^(?:[a-zA-Z]:[\\/]|\\\\)/;

const isWindowsPath = (file: string) => {
  return WINDOWS_ABSOLUTE_PATH_REGEXP.test(file) || file.includes('\\');
};

const normalizeWindowsPath = (file: string) => file.replace(/\//g, '\\');

const dirnameWin32 = (file: string) => {
  const normalized = normalizeWindowsPath(file).replace(/\\+$/, '');

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

const getPathUtils = (file: string) => {
  if (isWindowsPath(file)) {
    return {
      dirname: dirnameWin32,
      join: joinWin32,
    };
  }

  return {
    dirname,
    join,
  };
};

export function isPackagePath(path: string) {
  return /(^|[/\\])node_modules[/\\]/.test(path);
}

const PACKAGE_PREFIX = /(?:node_modules|~)(?:\/\.pnpm)?/;
const PACKAGE_SLUG = /[a-zA-Z0-9]+(?:[-|_|.]+[a-zA-Z0-9]+)*/;
const VERSION = /@[\w|\-|_|.]+/;
const VERSION_NUMBER = '@([\\d.]+)';

const MODULE_PATH_PACKAGES = new RegExp(
  [
    `(?:${PACKAGE_PREFIX.source}/)`,
    '(?:',
    `(?:@${PACKAGE_SLUG.source}[/|+])?`,
    `(?:${PACKAGE_SLUG.source}\\+)*`,
    `(?:${PACKAGE_SLUG.source})`,
    `(?:${VERSION.source})?`,
    ')',
    '(?:_',
    `(?:@${PACKAGE_SLUG.source}[/|+])?`,
    `(?:${PACKAGE_SLUG.source})`,
    `(?:@${PACKAGE_SLUG.source})?`,
    ')*',
    '/',
  ].join(''),
  'g',
);

const PACKAGE_PATH_NAME =
  /(?:(?:node_modules|~)(?:\/\.pnpm)?\/)(?:((?:@[a-zA-Z0-9]+(?:[-|_|.]+[a-zA-Z0-9]+)*[/|+])?(?:(?:[a-zA-Z0-9]+(?:[-|_|.]+[a-zA-Z0-9]+)*\+)*)(?:[a-zA-Z0-9]+(?:[-|_|.]+[a-zA-Z0-9]+)*))(?:@[\w|\-|_|.]+)?)(?:_((?:@[a-zA-Z0-9]+(?:[-|_|.]+[a-zA-Z0-9]+)*[/|+])?(?:[a-zA-Z0-9]+(?:[-|_|.]+[a-zA-Z0-9]+)*))(?:@[a-zA-Z0-9]+(?:[-|_|.]+[a-zA-Z0-9]+)*))*\//gm;

const uniqLast = (data: Array<unknown>) => {
  const res: Array<unknown> = [];

  data.forEach((item, index) => {
    if (!data.slice(index + 1).includes(item)) {
      res.push(item);
    }
  });

  return res;
};

const getPackageMetaFromModulePath = (
  modulePath: string,
): SDK.PackageJSONData => {
  const paths = modulePath.match(MODULE_PATH_PACKAGES);

  if (!paths) {
    return { name: '', version: '' };
  }

  const names = uniqLast(
    paths.flatMap((packagePath) => {
      const found = packagePath.matchAll(PACKAGE_PATH_NAME);

      if (!found) {
        return [];
      }

      const paksArray = compact([...found].flat());

      return paksArray
        .slice(1)
        .filter(Boolean)
        .map((name) => name.replace(/\+/g, '/'));
    }),
  );

  if (isEmpty(names)) {
    return { name: '', version: '' };
  }

  const name = last(names) as string;
  const pattern = new RegExp(`(.*)(${last(paths)}).*`);
  const path = modulePath.replace(pattern, '$1$2').replace(/\/$/, '');

  return {
    name,
    version:
      path && name
        ? path
            .match(new RegExp(`${name}${VERSION_NUMBER}`))
            ?.flat()
            .slice(1)?.[0] || ''
        : '',
  };
};

// TODO: add test for this function.
export const readPackageJson = (
  file: string,
  readFile?: SDK.GetPackageFile,
): SDK.PackageBasicData | undefined => {
  let result: SDK.PackageJSONData | undefined;
  let current = file;
  const pathUtils = getPathUtils(file);

  while (current !== '/' && !result) {
    if (pathUtils.dirname(current) === current) {
      break;
    }
    current = pathUtils.dirname(current);
    if (readFile) {
      result = readFile(pathUtils.join(current, 'package.json'));
    }
    if (!readFile) {
      result = getPackageMetaFromModulePath(file);
    } else if (!result?.name) {
      result = undefined;
    }
  }

  if (!result) {
    return;
  }

  // Some packages will put an empty package.json in the source folder.
  if (readFile && (!result.name || !result.version)) {
    return readPackageJson(pathUtils.dirname(current), readFile);
  }

  return {
    ...result,
    root: current,
  };
};
