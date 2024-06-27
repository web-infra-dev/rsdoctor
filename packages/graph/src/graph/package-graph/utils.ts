import { dirname, join } from 'path';
import { SDK } from '@rsdoctor/types';
import { Package as PackageUtil } from '@rsdoctor/utils/common';

export function isPackagePath(path: string) {
  return /(^|[/\\])node_modules[/\\]/.test(path);
}

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
      result = PackageUtil.getPackageMetaFromModulePath(file);
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
