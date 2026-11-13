import { expect, test } from '@test-kit/rstest';
import { compileByRspack } from '@scripts/test-helper';
import type { Compiler, Module } from '@rspack/core';
import path from 'path';
import { createRsdoctorPlugin } from './test-utils';

const entry = path.resolve(__dirname, './fixtures/a.js');

class LoaderHookPlugin {
  constructor(
    private readonly onModule: (module: Module, compiler: Compiler) => void,
  ) {}

  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap('LoaderHookPlugin', (compilation) => {
      compiler.webpack.NormalModule.getCompilationHooks(compilation).loader.tap(
        'LoaderHookPlugin',
        (_loaderContext, module) => this.onModule(module, compiler),
      );
    });
  }
}

function compileWithLoaderFeature(plugin: LoaderHookPlugin) {
  return compileByRspack(entry, {
    module: {
      rules: [
        {
          test: /\.js$/,
          loader: path.resolve(__dirname, './fixtures/loaders/comment.js'),
          options: { mode: 'sync' },
        },
      ],
    },
    plugins: [createRsdoctorPlugin({ features: ['loader'] }), plugin],
  });
}

test('lets loader hooks read native module accessors and call its methods', async () => {
  const seen: {
    layer: string | null | undefined;
    hasBuildInfo: boolean;
    conditionName: string | null | undefined;
    identifier: string;
    sameMethod: boolean;
    sameConstructor: boolean;
    hasStaticHooks: boolean;
  }[] = [];

  await compileWithLoaderFeature(
    new LoaderHookPlugin((module, compiler) => {
      seen.push({
        layer: module.layer,
        hasBuildInfo: typeof module.buildInfo === 'object',
        conditionName: module.nameForCondition(),
        identifier: module.identifier(),
        sameMethod: module.nameForCondition === module.nameForCondition,
        sameConstructor: module.constructor === compiler.webpack.NormalModule,
        hasStaticHooks:
          typeof (module.constructor as typeof compiler.webpack.NormalModule)
            .getCompilationHooks === 'function',
      });
    }),
  );

  expect(seen.length).toBeGreaterThan(0);
  expect(seen.map((item) => item.conditionName)).toContain(entry);
  expect(
    seen.every(
      (item) =>
        item.hasBuildInfo &&
        item.identifier.length > 0 &&
        item.sameMethod &&
        item.sameConstructor &&
        item.hasStaticHooks,
    ),
  ).toBe(true);
});

test('lets loader hooks set native module accessors', async () => {
  const sideEffectFree: boolean[] = [];

  await compileWithLoaderFeature(
    new LoaderHookPlugin((module) => {
      module.factoryMeta = { ...module.factoryMeta, sideEffectFree: true };
      sideEffectFree.push(module.factoryMeta?.sideEffectFree === true);
    }),
  );

  expect(sideEffectFree.length).toBeGreaterThan(0);
  expect(sideEffectFree.every(Boolean)).toBe(true);
});

test('keeps the module proxy as this for JavaScript methods', async () => {
  const sameLoaders: boolean[] = [];

  await compileWithLoaderFeature(
    new LoaderHookPlugin((module) => {
      const withMethod = module as Module & {
        loaders: unknown[];
        readLoaders?: () => unknown[];
      };
      withMethod.readLoaders = function (this: { loaders: unknown[] }) {
        return this.loaders;
      };
      sameLoaders.push(withMethod.readLoaders() === withMethod.loaders);
    }),
  );

  expect(sameLoaders.length).toBeGreaterThan(0);
  expect(sameLoaders.every(Boolean)).toBe(true);
});
