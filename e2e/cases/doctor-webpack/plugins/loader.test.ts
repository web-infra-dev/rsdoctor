import { Common } from '@rsdoctor/types';
import { compileByWebpack5 } from '@scripts/test-helper';
import { cloneDeep } from 'es-toolkit/compat';
import path from 'path';
import { test, expect } from '@playwright/test';
import type { NormalModule, WebpackPluginInstance } from 'webpack';
import { createRsdoctorPlugin } from '../test-utils';

const testLoaderPath = path.resolve(
  __dirname,
  '../fixtures/loaders/comment.cjs',
);

async function webpack(
  compile: typeof compileByWebpack5,
  transformer: (module: NormalModule) => void,
) {
  const file = path.resolve(__dirname, '../fixtures/b.js');

  const beforeTransform = (data: any) => data;
  let beforeTransformRes;
  const afterTransform = (data: any) => data;
  let afterTransformRes;

  /**
   * Based on https://github.com/arco-design/arco-plugins/blob/main/packages/plugin-webpack-react/src/arco-design-plugin/utils/index.ts#L37
   */
  const arcoDesignPluginForked: WebpackPluginInstance = {
    apply(compiler) {
      const pluginName = 'arco-design-plugin-forked';
      const mapper = (module: NormalModule) =>
        module.loaders.map((e) => ({
          loader: e.loader,
          options: cloneDeep(e.options),
        }));
      const hookHandler = (
        context: Common.PlainObject,
        module: NormalModule,
      ) => {
        beforeTransformRes = beforeTransform(mapper(module));
        transformer(module);
        afterTransformRes = afterTransform(mapper(module));
      };
      // @ts-ignore
      compiler.hooks.compilation.tap(pluginName, (compilation) => {
        compiler.webpack.NormalModule.getCompilationHooks(
          compilation,
        ).loader.tap(pluginName, hookHandler);
      });
    },
  };

  const RsdoctorPlugin = createRsdoctorPlugin({});

  const result = await compile(file, {
    optimization: {
      minimize: true,
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          use: {
            loader: testLoaderPath,
            options: {
              mode: 'callback',
            },
          },
        },
      ],
    },
    plugins: [
      // @ts-ignore
      RsdoctorPlugin,
      // @ts-ignore
      arcoDesignPluginForked,
    ],
  });

  return {
    RsdoctorPlugin,
    loaderData: RsdoctorPlugin.sdk.getStoreData().loader,
    afterTransformRes,
    beforeTransformRes,
  };
}

function createTests(title: string, compile: typeof compileByWebpack5) {
  test(`${title} basic usage`, async () => {
    const { loaderData, beforeTransformRes, afterTransformRes } = await webpack(
      compile,
      () => {},
    );

    expect(beforeTransformRes).toStrictEqual([
      { loader: testLoaderPath, options: { mode: 'callback' } },
    ]);

    expect(afterTransformRes).toStrictEqual([
      { loader: testLoaderPath, options: { mode: 'callback' } },
    ]);

    // test the data from sdk
    const { options, loader } = loaderData[0].loaders[0];
    expect(loader).toEqual(testLoaderPath);
    expect(options).toStrictEqual({ mode: 'callback' });
  });

  test(`${title} overwrite loader options`, async () => {
    const { loaderData, beforeTransformRes, afterTransformRes } = await webpack(
      compile,
      (module) => {
        module.loaders[0].options.mode = 'async';
      },
    );

    expect(beforeTransformRes).toStrictEqual([
      { loader: testLoaderPath, options: { mode: 'callback' } },
    ]);

    expect(afterTransformRes).toStrictEqual([
      { loader: testLoaderPath, options: { mode: 'async' } },
    ]);

    // test the data from sdk
    const { options, loader } = loaderData[0].loaders[0];
    expect(loader).toEqual(testLoaderPath);
    expect(options).toStrictEqual({ mode: 'async' });
  });

  test(`${title} add loader and overwrite options`, async () => {
    const { loaderData, beforeTransformRes, afterTransformRes } = await webpack(
      compile,
      (module) => {
        const originLoaders = cloneDeep(module.loaders);

        originLoaders[0].options.mode = 'async';

        module.loaders = [
          ...originLoaders,
          {
            loader: testLoaderPath,
            options: { pitchResult: '// hello world' },
            ident: null,
            type: null,
          },
        ];
      },
    );

    expect(beforeTransformRes).toStrictEqual([
      { loader: testLoaderPath, options: { mode: 'callback' } },
    ]);

    expect(afterTransformRes).toStrictEqual([
      { loader: testLoaderPath, options: { mode: 'async' } },
      {
        loader: testLoaderPath,
        options: { pitchResult: '// hello world' },
      },
    ]);

    // test the data from sdk
    expect(loaderData[0].loaders).toHaveLength(2);
    expect(loaderData[0].loaders[0].options).toStrictEqual({
      pitchResult: '// hello world',
    });
    expect(loaderData[0].loaders[1].options).toStrictEqual({
      mode: 'async',
    });
  });

  test(`${title} remove all loaders`, async () => {
    const { loaderData, beforeTransformRes, afterTransformRes } = await webpack(
      compile,
      (module) => {
        module.loaders.length = 0;
      },
    );

    expect(beforeTransformRes).toStrictEqual([
      { loader: testLoaderPath, options: { mode: 'callback' } },
    ]);

    expect(afterTransformRes).toStrictEqual([]);

    // test the data from sdk
    expect(loaderData).toHaveLength(0);
  });
}

createTests('[webpack5]', compileByWebpack5);
