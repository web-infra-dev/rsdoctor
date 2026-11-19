import { describe, expect, it } from 'rstack/test';
import { groupFilesByDir } from 'src/components/Overall/file-groups';

const file = (path: string) => ({ path, size: 1, initial: false });

describe('groupFilesByDir', () => {
  it('gives same-named files in different directories distinct keys', () => {
    const groups = groupFilesByDir([
      file('a/index.js'),
      file('b/index.js'),
      file('index.js'),
    ]);

    expect(
      groups.map(({ key, files }) => [key, files.map((f) => f.key)]),
    ).toEqual([
      ['dir:a', ['file:a/index.js']],
      ['dir:b', ['file:b/index.js']],
      ['dir:output', ['file:index.js']],
    ]);
  });

  it('keeps directory keys apart from file keys with the same path', () => {
    const keys = groupFilesByDir([
      file('static'),
      file('static/main.js'),
    ]).flatMap((group) => [group.key, ...group.files.map((f) => f.key)]);

    expect(new Set(keys).size).toBe(keys.length);
  });
});
