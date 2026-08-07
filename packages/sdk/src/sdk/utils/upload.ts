import { DataWithUrl } from '../sdk/types';

export const transformDataUrls = (
  d: DataWithUrl[],
): Record<string, string[] | string> => {
  return d.reduce((t: { [key: string]: string[] | string }, item) => {
    if (!Array.isArray(item.files)) {
      t[item.name] = item.files;
      return t;
    }

    const previous = t[item.name];
    t[item.name] = [
      ...(Array.isArray(previous) ? previous : []),
      ...item.files.map((e) => e.path),
    ];
    return t;
  }, {});
};
