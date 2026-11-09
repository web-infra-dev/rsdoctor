import { JsonStreamStringify } from 'json-stream-stringify';
import { SDK } from '@rsdoctor/shared/types';
import { dirname, join } from 'path';
import { Package } from '@rsdoctor/shared/common-browser';

const maxFileSize = 1024 * 1024 * 400; // Maximum length of each file is 400MB, measured in bytes.

export function stringify<T, P = T extends undefined ? undefined : string>(
  json: T,
  replacer?: (this: any, key: string, value: any) => any,
  space?: string | number,
  cycle?: boolean,
  chunkSize = maxFileSize,
): Promise<P> {
  const jsonList: string[] = [];
  if (json && typeof json === 'object') {
    return new Promise((resolve, reject) => {
      const stream = new JsonStreamStringify(json, replacer, space, cycle);

      let currentContent = '';

      stream
        .setEncoding('utf8')
        .on('data', (chunk: string) => {
          let offset = 0;
          while (offset < chunk.length) {
            // A retained high surrogate needs one more code unit, even for size 1.
            const capacity = Math.max(chunkSize, currentContent.length + 1);
            const end = Math.min(
              offset + capacity - currentContent.length,
              chunk.length,
            );
            currentContent += chunk.slice(offset, end);
            offset = end;
            if (currentContent.length >= chunkSize) {
              let splitAt = currentContent.length;
              const last = currentContent.charCodeAt(splitAt - 1);
              if (last >= 0xd800 && last <= 0xdbff) splitAt--;
              if (splitAt > 0) {
                jsonList.push(currentContent.slice(0, splitAt));
                currentContent = currentContent.slice(splitAt);
              }
            }
          }
        })
        .on('end', () => {
          if (currentContent.length > 0) {
            jsonList.push(currentContent);
          }
          resolve(jsonList as P);
        })
        .on('error', (err: any) => {
          return reject(err);
        });
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
