import { defineConfig } from '@rslib/core';

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
      },
      bundle: true,
      dts: true,
      format: 'cjs',
      syntax: 'es2021',
    },
  ],
  output: {
    externals: {
      bufferutil: 'bufferutil',
      'utf-8-validate': 'utf-8-validate',
    },
    copy: {
      patterns: [{ from: 'resources', to: 'resources' }],
    },
  },
});
