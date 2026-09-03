import { Loader } from '@rsdoctor/shared/common-browser';
import { rspack } from '@rspack/core';
import { describe, it, expect } from 'rstack/test';
import path from 'path';
import fs from 'node:fs';
import os from 'node:os';
import type { ProxyLoaderInternalOptions, ProxyLoaderOptions } from '@/types';
import { interceptLoader } from '@/inner-plugins/utils';
import { InternalLoaderPlugin } from '@/inner-plugins/plugins/loader';

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
    const compiler = rspack({
      context: exampleWebpackPath,
    });
    const loaderResolver = compiler.resolverFactory.get(
      'loader',
      compiler.options.resolveLoader,
    );
    const customCompiler = rspack({
      context: exampleWebpackPath,
      resolveLoader: {
        modules: [path.join(exampleWebpackPath, 'node_modules')],
      },
    });
    const customLoaderResolver = customCompiler.resolverFactory.get(
      'loader',
      customCompiler.options.resolveLoader,
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
          loaderResolver,
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
          loaderResolver,
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
          loaderResolver,
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
          loaderResolver,
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
          loaderResolver,
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
          loaderResolver,
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

    it('[string] rule.loader with resolveLoader', () => {
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
          customLoaderResolver,
          exampleWebpackPath,
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

    it('rotates the persistent-cache marker between Rsdoctor sessions', () => {
      const outputDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'rsdoctor-loader-cache-'),
      );
      try {
        const persistentCompiler = rspack({
          context: exampleWebpackPath,
          cache: {
            type: 'persistent',
            storage: {
              type: 'filesystem',
              directory: path.join(outputDir, 'rspack-cache'),
            },
          },
        });
        const createPlugin = () =>
          new InternalLoaderPlugin({
            options: {
              loaderInterceptorOptions: { skipLoaders: [] },
            },
            sdk: {
              outputDir,
              root: exampleWebpackPath,
              server: { origin: 'http://localhost:5100' },
            },
          } as any);
        const rule = [{ test: /\.js$/, loader: babelLoader }];
        const getCacheMarkerPath = (plugin: InternalLoaderPlugin<any>) => {
          const [result] = plugin.getInterceptRules(
            persistentCompiler,
            rule,
          ) as Array<{ options: ProxyLoaderOptions }>;
          return result.options[Loader.LoaderInternalPropertyName]
            .cacheMarkerPath!;
        };

        const firstPlugin = createPlugin();
        const markerPath = getCacheMarkerPath(firstPlugin);
        const firstMarker = fs.readFileSync(markerPath, 'utf8');
        expect(getCacheMarkerPath(firstPlugin)).toBe(markerPath);
        expect(fs.readFileSync(markerPath, 'utf8')).toBe(firstMarker);

        expect(getCacheMarkerPath(createPlugin())).toBe(markerPath);
        expect(fs.readFileSync(markerPath, 'utf8')).not.toBe(firstMarker);
      } finally {
        fs.rmSync(outputDir, { recursive: true, force: true });
      }
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
          loaderResolver,
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
