import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export const resolveClientHtmlPath = (innerClientPath?: string): string => {
  return innerClientPath || require.resolve('@rsdoctor/client');
};

export const resolveClientDistPath = (innerClientPath?: string): string => {
  return path.dirname(resolveClientHtmlPath(innerClientPath));
};

export const resolveClientDiffHtmlPath = (innerClientPath?: string): string => {
  return path.resolve(resolveClientDistPath(innerClientPath), 'diff.html');
};
