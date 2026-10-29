import path from 'node:path';
import { DataWithUrl } from '../sdk/types';

export const transformDataUrls = (
  d: DataWithUrl[],
  baseDir?: string,
): Record<string, string[] | string> => {
  return d.reduce((t: { [key: string]: string[] | string }, item) => {
    if (!Array.isArray(item.files)) {
      t[item.name] = item.files;
      return t;
    }

    const previous = t[item.name];
    t[item.name] = [
      ...(Array.isArray(previous) ? previous : []),
      ...item.files.map((e) => {
        if (!baseDir) return e.path;

        // Manifest files and their shards are commonly uploaded or archived
        // together. Keep their references portable instead of embedding the
        // machine-specific output directory.
        return path.relative(baseDir, e.path).split(path.sep).join('/');
      }),
    ];
    return t;
  }, {});
};
