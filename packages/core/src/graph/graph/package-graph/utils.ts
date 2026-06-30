import { SDK } from '@rsdoctor/types';
import { compact, isEmpty, last } from 'es-toolkit/compat';
import path from 'path-browserify';

const { dirname, join } = path;

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

  while (current !== '/' && !result) {
    if (dirname(current) === current) {
      break;
    }
    current = dirname(current);
    if (readFile) {
      result = readFile(join(current, 'package.json'));
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
    return readPackageJson(dirname(current), readFile);
  }

  return {
    ...result,
    root: current,
  };
};
