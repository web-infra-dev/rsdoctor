import { JsonStreamStringify } from 'json-stream-stringify';
import { PassThrough } from 'stream';
import { SDK } from '@rsdoctor/types';
import { dirname, join } from 'path';
import { Package } from 'src/common';

export function stringify<T, P = T extends undefined ? undefined : string>(
  json: T,
  replacer?: (this: any, key: string, value: any) => any,
  space?: string | number,
  cycle?: boolean,
): Promise<P> {
  if (json && typeof json === 'object') {
    return new Promise((resolve, reject) => {
      let res = '';
      const pt = new PassThrough();
      const stream = new JsonStreamStringify(json, replacer, space, cycle);

      pt.on('data', (chunk) => {
        res += chunk;
      });

      pt.on('end', () => {
        return resolve(res as P);
      });

      pt.on('error', (err) => {
        return reject(err);
      });

      stream.on('error', (err) => {
        return reject(err);
      });

      stream.pipe(pt);
    });
  }

  return Promise.resolve(JSON.stringify(json, replacer, space) as P);
}

// TODO: add test for this function.
export const readPackageJson = (
  file: string,
  readFile?: SDK.GetPackageFile,
): SDK.PackageBasicData | undefined => {
  let result: SDK.PackageJSONData | undefined;
  let current = file;

  while (current !== '/' && !result) {
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
    if (readFile) {
      result = readFile(join(current, 'package.json'));
    }
    if (!readFile) {
      result = Package.getPackageMetaFromModulePath(file);
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
