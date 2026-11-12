import { expect, test } from '@test-kit/rstest';
import { compileByRspack } from '@scripts/test-helper';
import type { Compiler, RspackPluginInstance } from '@rspack/core';
import path from 'path';
import { createRsdoctorPlugin } from './test-utils';

const entry = path.resolve(__dirname, './fixtures/a.js');
const commentLoader = path.resolve(__dirname, './fixtures/loaders/comment.js');

type HookLoader = { loader: string };

const loaderName = (loader: string) => path.basename(loader.split('?')[0]);

class LoaderHookPlugin {
  seen: string[][] = [];

  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap('LoaderHookPlugin', (compilation) => {
      compiler.webpack.NormalModule.getCompilationHooks(compilation).loader.tap(
        'LoaderHookPlugin',
        (_loaderContext, module) => {
          const normalModule = module as unknown as { loaders: HookLoader[] };
          this.seen.push(
            normalModule.loaders.map((item) => loaderName(item.loader)),
          );
        },
      );
    });
  }
}

function compile(plugins: RspackPluginInstance[]) {
  return compileByRspack(entry, {
    module: {
      rules: [
        {
          test: /\.js$/,
          loader: commentLoader,
          options: { mode: 'sync' },
        },
      ],
    },
    plugins,
  });
}

test('loader hooks see the configured loaders without Rsdoctor', async () => {
  const hook = new LoaderHookPlugin();
  await compile([hook]);
  expect(hook.seen.length).toBeGreaterThan(0);
  expect([...new Set(hook.seen.flat())]).toEqual(['comment.js']);
});

test('loader hooks see the configured loaders with loader profiling on', async () => {
  const hook = new LoaderHookPlugin();
  await compile([createRsdoctorPlugin({ features: ['loader'] }), hook]);
  expect(hook.seen.length).toBeGreaterThan(0);
  expect([...new Set(hook.seen.flat())]).toEqual(['comment.js']);
});
