import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      source: {
        entry: {
          index: './src/!(resources)/**/*.ts',
        },
        tsconfigPath: './tsconfig.build.json',
      },
      output: {
        distPath: {
          root: './dist/',
        },
      },
      bundle: false,
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
      patterns: [{ from: 'src/resources', to: 'resources' }],
    },
  },
});
