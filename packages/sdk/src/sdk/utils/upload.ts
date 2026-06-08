import path from 'node:path';
import { DataWithUrl } from '../sdk/types';

export const transformDataUrls = (
  d: DataWithUrl[],
  baseDir?: string,
): Record<string, string[] | string> => {
  return d.reduce((t: { [key: string]: string[] | string }, item) => {
    t[item.name] = Array.isArray(item.files)
      ? item.files
          .map((e) => {
            if (!baseDir) {
              return e.path;
            }

            return path.relative(baseDir, e.path).split(path.sep).join('/');
          })
          .concat(t[item.name] || [])
      : item.files;
    return t;
  }, {});
};
