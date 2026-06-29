import { JsonStreamStringify } from 'json-stream-stringify';
import { SDK } from '@rsdoctor/types';
import { dirname, join } from 'path';
import { Package } from 'src/common';
import { Transform } from 'stream';

const maxFileSize = 1024 * 1024 * 400; // Maximum length of each file is 400MB, measured in bytes.

export function stringify<T, P = T extends undefined ? undefined : string>(
  json: T,
  replacer?: (this: any, key: string, value: any) => any,
  space?: string | number,
  cycle?: boolean,
): Promise<P> {
  const jsonList: string[] = [];
  if (json && typeof json === 'object') {
    return new Promise((resolve, reject) => {
      const stream = new JsonStreamStringify(json, replacer, space, cycle);

      let currentLength = 0;
      let currentContent = '';

      const batchProcessor = new Transform({
        readableObjectMode: true,
        transform(chunk, _encoding, callback) {
          const lines = chunk.toString().split('\\n');

          lines.forEach((line: string | any[]) => {
            if (currentLength + line.length > maxFileSize) {
              // 超出最大长度，保存当前内容
              jsonList.push(currentContent);
              currentContent = '';
              currentLength = 0;
            }

            if (line.length) {
              currentContent += line;
              currentLength += line.length;
            }
          });

          callback();
        },
      });

      stream
        .pipe(batchProcessor)
        .on('data', (line: string | any[]) => {
          if (currentLength + line.length > maxFileSize) {
            //Exceeding the maximum length, closing the current file stream.
            jsonList.push(currentContent);
            currentContent = '';
            currentLength = 0;
          }

          if (line.length) {
            currentContent += line;
            currentLength += line.length;
          }
        })
        .on('end', () => {
          if (jsonList.length < 1) {
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
