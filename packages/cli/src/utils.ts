import axios from 'axios';
import path from 'path';
import fs from 'node:fs';
import { Ora } from 'ora';
import { Command } from './types';
import { Common } from '@rsdoctor/types';
import { Url } from '@rsdoctor/utils/common';

export function enhanceCommand<CMD extends string, Options, Result>(
  fn: Command<CMD, Options, Result>,
): Command<CMD, Options, Result> {
  return (ctx) => {
    const res = fn(ctx);
    return res;
  };
}

export async function fetchText(url: string) {
  const { data } = await axios.get(url, {
    timeout: 60000,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Accept-Encoding': 'gzip,deflate,compress',
    },
  });
  return data;
}

export async function readFile(url: string, cwd: string) {
  const file = path.resolve(cwd, url);

  return fs.readFileSync(file, 'utf-8');
}

export async function loadJSON<T extends Common.PlainObject>(
  uri: string,
  cwd: string,
): Promise<T> {
  if (Url.isUrl(uri)) {
    const data = await fetchText(uri);

    return data;
  }

  const file = await readFile(uri, cwd);

  return JSON.parse(file);
}

export async function loadShardingFile(
  uri: string,
  cwd: string,
): Promise<string> {
  if (Url.isUrl(uri)) {
    return fetchText(uri);
  }

  if (Url.isFilePath(uri)) {
    return readFile(uri, cwd);
  }

  return Promise.resolve(uri);
}

export async function loadShardingFileWithSpinner(
  uri: string,
  cwd: string,
  spinner: Ora,
): Promise<string> {
  return loadShardingFile(uri, cwd).then((res) => {
    spinner.text = `loaded "${uri}"`;
    return res;
  });
}
