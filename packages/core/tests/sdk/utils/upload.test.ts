import { describe, expect, it } from '@rstest/core';
import { transformDataUrls } from '@/sdk/utils';

describe('transformDataUrls', () => {
  it('preserves the order of multiple batches for the same key', () => {
    const createFile = (filePath: string) => ({
      path: filePath,
      basename: filePath,
      content: Buffer.from(filePath),
    });

    const result = transformDataUrls([
      {
        name: 'moduleGraph',
        files: [createFile('/moduleGraph/1'), createFile('/moduleGraph/2')],
      },
      {
        name: 'moduleGraph',
        files: [createFile('/moduleGraph/3'), createFile('/moduleGraph/4')],
      },
    ]);

    expect(result.moduleGraph).toStrictEqual([
      '/moduleGraph/1',
      '/moduleGraph/2',
      '/moduleGraph/3',
      '/moduleGraph/4',
    ]);
  });
});
