import { Loader } from '@rsdoctor/utils/common';
import { describe, it, expect } from '@rstest/core';
import path from 'path';
import { ProxyLoaderInternalOptions } from '@/types';
import { interceptLoader, type CompatibleResolve } from '@/inner-plugins/utils';

describe('test src/utils/loader.ts', () => {
  describe('interceptLoader()', () => {
    const babelLoader = 'babel-loader';
    const stringLoader = 'string-loader';
    const tsLoader = 'ts-loader';
    const resolvedBabelLoader = require.resolve(babelLoader);
    const resolvedStringLoader = require.resolve(stringLoader);
    const exampleWebpackPath = path.resolve(__dirname, '../../');
    const resolvedTsLoader = require.resolve(tsLoader, {
      paths: [exampleWebpackPath],
    });
    const proxyLoaderPath = path.resolve(
      __dirname,
      '../../src/loaders/proxy.ts',
    );
    const internalOptions: Omit<
      ProxyLoaderInternalOptions,
      'loader' | 'hasOptions'
    > = {
      cwd: __dirname,
      host: 'http://localhost:3000',
      skipLoaders: ['a', 'b'],
    };

    it('[string] rule.loader', () => {
      expect(
        interceptLoader(
          [
            {
              test: /\.js$/,
              loader: babelLoader,
              options: {
                a: 1,
              },
            },
          ],
          proxyLoaderPath,
          internalOptions,
          path.join(__dirname, '../../'),
        ),
      ).toStrictEqual([
        {
          test: /\.js$/,
          loader: proxyLoaderPath,
          options: {
            a: 1,
            [Loader.LoaderInternalPropertyName]: {
              ...internalOptions,
              hasOptions: true,
              loader: resolvedBabelLoader,
            },
          },
        },
      ]);
    });

    it('[Array] rule.loaders', () => {
      expect(
        interceptLoader(
          [
            {
              test: /\.js$/,
              loaders: [
                {
                  loader: babelLoader,
                  options: {
                    aa: 1,
                  },
                },
              ],
            },
          ],
          proxyLoaderPath,
          internalOptions,
          path.join(__dirname, '../../'),
        ),
      ).toStrictEqual([
        {
          test: /\.js$/,
          use: [
            {
              loader: proxyLoaderPath,
              options: {
                aa: 1,
                [Loader.LoaderInternalPropertyName]: {
                  ...internalOptions,
                  hasOptions: true,
                  loader: resolvedBabelLoader,
                },
              },
            },
          ],
        },
      ]);
    });

    it('[String] rule.use', () => {
      expect(
        interceptLoader(
          [
            {
              test: /\.js$/,
              use: [babelLoader],
            },
          ],
          proxyLoaderPath,
          internalOptions,
          path.join(__dirname, '../../'),
        ),
      ).toStrictEqual([
        {
          test: /\.js$/,
          use: [
            {
              loader: proxyLoaderPath,
              options: {
                [Loader.LoaderInternalPropertyName]: {
                  ...internalOptions,
                  hasOptions: false,
                  loader: resolvedBabelLoader,
                },
              },
            },
          ],
        },
      ]);
    });

    it('[Array] rule.use', () => {
      expect(
        interceptLoader(
          [
            {
              test: /\.js$/,
              use: [
                {
                  loader: babelLoader,
                  options: {
                    aa: 1,
                  },
                },
                stringLoader,
              ],
            },
          ],
          proxyLoaderPath,
          internalOptions,
          path.join(__dirname, '../../'),
        ),
      ).toStrictEqual([
        {
          test: /\.js$/,
          use: [
            {
              loader: proxyLoaderPath,
              options: {
                aa: 1,
                [Loader.LoaderInternalPropertyName]: {
                  ...internalOptions,
                  hasOptions: true,
                  loader: resolvedBabelLoader,
                },
              },
            },
            {
              loader: proxyLoaderPath,
              options: {
                [Loader.LoaderInternalPropertyName]: {
                  ...internalOptions,
                  hasOptions: false,
                  loader: resolvedStringLoader,
                },
              },
            },
          ],
        },
      ]);
    });

    it('[Array] rule.rules', () => {
      expect(
        interceptLoader(
          [
            {
              test: /\.js$/,
              rules: [
                {
                  test: /a/,
                  use: [babelLoader],
                },
              ],
            },
          ],
          proxyLoaderPath,
          internalOptions,
          path.join(__dirname, '../../'),
        ),
      ).toStrictEqual([
        {
          test: /\.js$/,
          rules: [
            {
              test: /a/,
              use: [
                {
                  loader: proxyLoaderPath,
                  options: {
                    [Loader.LoaderInternalPropertyName]: {
                      ...internalOptions,
                      hasOptions: false,
                      loader: resolvedBabelLoader,
                    },
                  },
                },
              ],
            },
          ],
        },
      ]);
    });

    it('[Array] rule.oneOf', () => {
      expect(
        interceptLoader(
          [
            {
              test: /\.js$/,
              oneOf: [
                {
                  test: /a/,
                  use: [babelLoader],
                },
                {
                  test: /b/,
                  use: [babelLoader],
                },
              ],
            },
          ],
          proxyLoaderPath,
          internalOptions,
          path.join(__dirname, '../../'),
        ),
      ).toStrictEqual([
        {
          test: /\.js$/,
          oneOf: [
            {
              test: /a/,
              use: [
                {
                  loader: proxyLoaderPath,
                  options: {
                    [Loader.LoaderInternalPropertyName]: {
                      ...internalOptions,
                      hasOptions: false,
                      loader: resolvedBabelLoader,
                    },
                  },
                },
              ],
            },
            {
              test: /b/,
              use: [
                {
                  loader: proxyLoaderPath,
                  options: {
                    [Loader.LoaderInternalPropertyName]: {
                      ...internalOptions,
                      hasOptions: false,
                      loader: resolvedBabelLoader,
                    },
                  },
                },
              ],
            },
          ],
        },
      ]);
    });

    it('[string] rule.loader with resolveOptions', () => {
      expect(
        interceptLoader(
          [
            {
              test: /\.ts$/,
              loader: tsLoader,
              options: {
                a: 1,
              },
            },
          ],
          proxyLoaderPath,
          internalOptions,
          undefined,
          {
            modules: [path.join(exampleWebpackPath, 'node_modules')],
          },
        ),
      ).toStrictEqual([
        {
          test: /\.ts$/,
          loader: proxyLoaderPath,
          options: {
            a: 1,
            [Loader.LoaderInternalPropertyName]: {
              ...internalOptions,
              hasOptions: true,
              loader: resolvedTsLoader,
            },
          },
        },
      ]);
    });

    it.each([
      { fallback: resolvedStringLoader },
      { fallback: [resolvedStringLoader] },
      { fallback: ['/missing/loader.js', resolvedStringLoader] },
      { fallback: [false as const, resolvedStringLoader] },
      { fallback: false as const },
    ])('normalizes resolveLoader.fallback value $fallback', ({ fallback }) => {
      const result = interceptLoader(
        [{ loader: 'missing-loader' }],
        proxyLoaderPath,
        internalOptions,
        exampleWebpackPath,
        { fallback: { 'missing-loader': fallback } },
      );

      expect(result).toMatchObject([
        {
          options: {
            [Loader.LoaderInternalPropertyName]: {
              loader:
                fallback === false ||
                (Array.isArray(fallback) && fallback[0] === false)
                  ? 'missing-loader'
                  : resolvedStringLoader,
            },
          },
        },
      ]);
    });

    it.each([false, undefined, {}] satisfies CompatibleResolve['fallback'][])(
      'accepts empty or disabled resolveLoader.fallback %j',
      (fallback) => {
        expect(() =>
          interceptLoader(
            [{ loader: stringLoader }],
            proxyLoaderPath,
            internalOptions,
            exampleWebpackPath,
            { fallback },
          ),
        ).not.toThrow();
      },
    );

    it('supports webpack fallback entries with exact matching', () => {
      const result = interceptLoader(
        [{ loader: 'missing-loader' }, { loader: 'missing-loader/subpath' }],
        proxyLoaderPath,
        internalOptions,
        exampleWebpackPath,
        {
          fallback: [
            {
              name: 'missing-loader',
              alias: resolvedStringLoader,
              onlyModule: true,
            },
          ],
        },
      );

      expect(result).toMatchObject(
        [resolvedStringLoader, 'missing-loader/subpath'].map((loader) => ({
          options: { [Loader.LoaderInternalPropertyName]: { loader } },
        })),
      );
    });

    it.each([
      {
        aliases: [resolvedStringLoader, resolvedBabelLoader],
        expected: resolvedStringLoader,
      },
      {
        aliases: ['/missing/loader.js', resolvedStringLoader],
        expected: 'missing-loader',
      },
      {
        aliases: [false as const, resolvedStringLoader],
        expected: 'missing-loader',
      },
    ])(
      'preserves duplicate fallback order: $aliases',
      ({ aliases, expected }) => {
        const result = interceptLoader(
          [{ loader: 'missing-loader' }],
          proxyLoaderPath,
          internalOptions,
          exampleWebpackPath,
          {
            fallback: aliases.map((alias) => ({
              name: 'missing-loader',
              alias,
            })),
          },
        );

        expect(result).toMatchObject([
          {
            options: {
              [Loader.LoaderInternalPropertyName]: { loader: expected },
            },
          },
        ]);
      },
    );

    it('preserves interleaved exact and prefix fallback order', () => {
      const result = interceptLoader(
        [{ loader: 'missing-loader' }],
        proxyLoaderPath,
        internalOptions,
        exampleWebpackPath,
        {
          fallback: [
            { name: 'missing-loader', alias: 'missing-loader' },
            {
              name: 'missing-loader',
              alias: resolvedStringLoader,
              onlyModule: true,
            },
            { name: 'missing-loader', alias: resolvedBabelLoader },
          ],
        },
      );

      expect(result).toMatchObject([
        {
          options: {
            [Loader.LoaderInternalPropertyName]: {
              loader: resolvedStringLoader,
            },
          },
        },
      ]);
    });

    it('builtin:swc-loader test', () => {
      expect(
        interceptLoader(
          [
            {
              test: /\.jsx$/,
              use: {
                loader: 'builtin:swc-loader',
                options: {
                  jsc: {
                    parser: {
                      syntax: 'ecmascript',
                      jsx: true,
                    },
                    transform: {
                      react: {
                        pragma: 'React.createElement',
                        pragmaFrag: 'React.Fragment',
                        throwIfNamespace: true,
                        development: false,
                        useBuiltins: false,
                      },
                    },
                  },
                },
              },
            },
          ],
          proxyLoaderPath,
          internalOptions,
        ),
      ).toStrictEqual([
        {
          test: /\.jsx$/,
          use: [
            {
              loader: 'builtin:swc-loader',
              options: {
                jsc: {
                  parser: {
                    syntax: 'ecmascript',
                    jsx: true,
                  },
                  transform: {
                    react: {
                      pragma: 'React.createElement',
                      pragmaFrag: 'React.Fragment',
                      throwIfNamespace: true,
                      development: false,
                      useBuiltins: false,
                    },
                  },
                },
              },
            },
          ],
        },
      ]);
    });
  });
});
