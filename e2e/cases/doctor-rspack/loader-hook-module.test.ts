import { expect, test } from '@test-kit/rstest';
import { compileByRspack } from '@scripts/test-helper';
import { Loader } from '@rsdoctor/shared/common-browser';
import type { Compiler, LoaderContext, Module } from '@rspack/core';
import path from 'path';
import { createRsdoctorPlugin } from './test-utils';

const entry = path.resolve(__dirname, './fixtures/a.js');
const extraLoader = path.resolve(
  __dirname,
  './fixtures/loaders/serialize-query-to-comment.js',
);

type HookLoader = { loader: string; options?: Record<string, unknown> };
type HookModule = Module & { loaders: HookLoader[] };

class LoaderHookPlugin {
  constructor(
    private readonly onModule: (
      module: HookModule,
      compiler: Compiler,
      loaderContext: LoaderContext,
    ) => void,
  ) {}

  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap('LoaderHookPlugin', (compilation) => {
      compiler.webpack.NormalModule.getCompilationHooks(compilation).loader.tap(
        'LoaderHookPlugin',
        (loaderContext, module) =>
          this.onModule(module as HookModule, compiler, loaderContext),
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
    sameContextModule: boolean;
  }[] = [];

  await compileWithLoaderFeature(
    new LoaderHookPlugin((module, compiler, loaderContext) => {
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
        sameContextModule: loaderContext._module === module,
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
        item.hasStaticHooks &&
        item.sameContextModule,
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

function expectLoadersRestored(exposed: Map<HookModule, HookLoader[]>) {
  expect(exposed.size).toBeGreaterThan(0);
  for (const [module, loaders] of exposed) {
    expect(Array.isArray(module.loaders)).toBe(true);
    expect(module.loaders).not.toBe(loaders);
  }
}

test('restores the module loaders after the hook returns', async () => {
  const exposed = new Map<HookModule, HookLoader[]>();

  await compileWithLoaderFeature(
    new LoaderHookPlugin((module) => {
      exposed.set(module, module.loaders);
    }),
  );

  expectLoadersRestored(exposed);
});

test('restores the module loaders after the hook throws', async () => {
  const exposed = new Map<HookModule, HookLoader[]>();

  await expect(
    compileWithLoaderFeature(
      new LoaderHookPlugin((module) => {
        exposed.set(module, module.loaders);
        throw new Error('loader hook failure');
      }),
    ),
  ).rejects.toBeTruthy();

  expectLoadersRestored(exposed);
});

test('rewraps loaders replaced by a hook', async () => {
  const replaced = new Set<HookModule>();

  await compileWithLoaderFeature(
    new LoaderHookPlugin((module) => {
      if (replaced.has(module)) return;
      replaced.add(module);
      module.loaders = [
        ...module.loaders,
        { loader: extraLoader, options: { extra: true } },
      ];
    }),
  );

  expect(replaced.size).toBeGreaterThan(0);
  for (const module of replaced) {
    const added = module.loaders.at(-1);
    expect(added?.loader).not.toBe(extraLoader);
    expect(added?.options).toMatchObject({
      extra: true,
      [Loader.LoaderInternalPropertyName]: { loader: extraLoader },
    });
  }
});

test('ignores a non-array loaders value left by a hook', async () => {
  let calls = 0;

  await compileWithLoaderFeature(
    new LoaderHookPlugin((module) => {
      calls += 1;
      (module as { loaders: unknown }).loaders = undefined;
    }),
  );

  expect(calls).toBeGreaterThan(0);
});
