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
      dts: false,
      format: 'esm',
      syntax: 'es2021',
    },
  ],
  output: {
    copy: {
      patterns: [{ from: 'resources', to: 'resources' }],
    },
  },
});
