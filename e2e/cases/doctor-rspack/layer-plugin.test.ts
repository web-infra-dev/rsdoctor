import { expect, test } from '@test-kit/rstest';
import { compileByRspackLayers } from '@scripts/test-helper';
import path from 'path';
import { createRsdoctorPlugin } from './test-utils';

async function rspackCompile(compile: typeof compileByRspackLayers) {
  const file = path.resolve(__dirname, './fixtures/a.js');
  const loader = path.resolve(__dirname, './fixtures/loaders/comment.js');
  const plugin = createRsdoctorPlugin({});

  await compile(file, {
    entry: {
      main: {
        import: file,
        layer: 'modern',
      },
      legacy: {
        import: file,
        layer: 'legacy',
      },
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.js/,
          use: loader,
        },
        {
          test: /\.css$/,
          use: [
            {
              loader: 'builtin:lightningcss-loader',
              options: {
                targets: 'ie 10',
              },
            },
          ],
        },
        {
          test: /\.(jsx?|tsx?)$/,
          issuerLayer: 'modern',
          use: [
            {
              loader: 'builtin:swc-loader',
              options: {
                jsc: {
                  parser: {
                    syntax: 'typescript',
                    tsx: true,
                  },
                  transform: {
                    react: {
                      runtime: 'automatic',
                    },
                  },
                },
                env: {
                  targets: ['Chrome >= 10'],
                },
              },
            },
          ],
        },
        {
          test: /\.(jsx?|tsx?)$/,
          issuerLayer: 'legacy',
          use: [
            {
              loader: 'builtin:swc-loader',
              options: {
                jsc: {
                  parser: {
                    syntax: 'typescript',
                    tsx: true,
                  },
                  transform: {
                    react: {
                      runtime: 'automatic',
                    },
                  },
                },
                env: {
                  targets: ['Chrome >= 100'],
                },
              },
            },
          ],
        },
      ],
    },
    experiments: {
      // @ts-ignore
      layers: true,
    },
    plugins: [
      // @ts-ignore
      plugin,
    ],
  });

  return plugin.sdk;
}

test('rspack data store', async () => {
  const sdk = await rspackCompile(compileByRspackLayers);
  const datas = sdk.getStoreData();
  const graphData = datas.moduleGraph;
  const layerList = graphData.modules.map((m) => m.layer);
  expect(layerList.filter((i) => i === 'modern').length).toBe(2);
  expect(layerList.filter((i) => i === 'legacy').length).toBe(2);
  expect(graphData.layers).toContain('modern');
  expect(graphData.layers).toContain('legacy');
});
