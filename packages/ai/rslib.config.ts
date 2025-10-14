import { defineConfig } from '@rslib/core';
import prebundleConfig from './prebundle.config.mjs';

const regexpMap: Record<string, RegExp> = {};

for (const item of prebundleConfig.dependencies) {
  const depName = typeof item === 'string' ? item : item.name;
  if (typeof item !== 'string' && item.dtsOnly) {
    continue;
  }

  regexpMap[depName] = new RegExp(`compiled[\\/]${depName}(?:[\\/]|$)`);
}

const externalsPrebundle = [
  ({ request }: { request?: string }, callback: any) => {
    if (request) {
      const entries = Object.entries(regexpMap);
      for (const [name, test] of entries) {
        if (test.test(request)) {
          return callback(undefined, `../compiled/${name}/index.cjs`);
        }
      }
    }
    callback();
  },
];

const externals = [...externalsPrebundle];

export default defineConfig({
  lib: [
    {
      source: {
        entry: {
          index: './src/server/server.ts',
        },
        tsconfigPath: './tsconfig.build.json',
      },
      output: {
        distPath: {
          root: './dist/',
        },
        externals,
      },
      bundle: true,
      dts: false,
      format: 'esm',
      syntax: 'es2021',
    },
  ],
  output: {
    externals: {
      events: 'node-commonjs events',
    },
    copy: {
      patterns: [{ from: 'resources', to: 'resources' }],
    },
  },
});
