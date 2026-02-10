import { describe, it, expect } from '@rstest/core';
import { SDK } from '@rsdoctor/types';
import {
  getLoaderFileDetails,
  getLoaderFileInputAndOutput,
} from '../../src/common/loader';

describe('test src/common/loader.ts', () => {
  const mockLoaderData: SDK.LoaderData = [
    {
      resource: {
        path: '/test/file.js',
        queryRaw: '',
        query: {},
        ext: 'js',
      },
      loaders: [
        {
          loader: 'babel-loader',
          loaderIndex: 0,
          path: '/node_modules/babel-loader/lib/index.js',
          input: 'const foo = 1;',
          result: 'var foo = 1;',
          startAt: 1000,
          endAt: 1100,
          options: {},
          isPitch: false,
          sync: true,
          errors: [],
          pid: 1,
          ppid: 0,
        },
        {
          loader: 'ts-loader',
          loaderIndex: 1,
          path: '/node_modules/ts-loader/index.js',
          input: 'const bar: number = 2;',
          result: 'const bar = 2;',
          startAt: 900,
          endAt: 950,
          options: {},
          isPitch: false,
          sync: true,
          errors: [],
          pid: 1,
          ppid: 0,
        },
      ],
    },
  ];

  it('getLoaderFileDetails should strip input and result fields', () => {
    const result = getLoaderFileDetails('/test/file.js', mockLoaderData);

    expect(result).toBeDefined();
    expect(result.resource.path).toBe('/test/file.js');
    expect(result.loaders).toHaveLength(2);

    // Verify that input and result are NOT included
    result.loaders.forEach((loader) => {
      expect(loader).not.toHaveProperty('input');
      expect(loader).not.toHaveProperty('result');
      // But other properties should be present
      expect(loader.loader).toBeDefined();
      expect(loader.loaderIndex).toBeDefined();
      expect(loader.costs).toBeDefined();
    });
  });

  it('getLoaderFileInputAndOutput should return input and output for first loader', () => {
    const result = getLoaderFileInputAndOutput(
      '/test/file.js',
      'babel-loader',
      0,
      mockLoaderData,
    );

    expect(result).toBeDefined();
    expect(result.input).toBe('const foo = 1;');
    expect(result.output).toBe('var foo = 1;');
  });

  it('getLoaderFileInputAndOutput should return input and output for second loader (loaderIndex: 1)', () => {
    const result = getLoaderFileInputAndOutput(
      '/test/file.js',
      'ts-loader',
      1,
      mockLoaderData,
    );

    expect(result).toBeDefined();
    expect(result.input).toBe('const bar: number = 2;');
    expect(result.output).toBe('const bar = 2;');
  });

  it('getLoaderFileInputAndOutput should return empty strings for non-existent loader', () => {
    const result = getLoaderFileInputAndOutput(
      '/test/file.js',
      'non-existent-loader',
      0,
      mockLoaderData,
    );

    expect(result.input).toBe('');
    expect(result.output).toBe('');
  });

  it('getLoaderFileInputAndOutput should return empty strings for non-existent file', () => {
    const result = getLoaderFileInputAndOutput(
      '/non-existent/file.js',
      'babel-loader',
      0,
      mockLoaderData,
    );

    expect(result.input).toBe('');
    expect(result.output).toBe('');
  });

  it('getLoaderFileDetails should throw error for non-existent file', () => {
    expect(() => {
      getLoaderFileDetails('/non-existent/file.js', mockLoaderData);
    }).toThrow('"/non-existent/file.js" not match any loader data');
  });
});
