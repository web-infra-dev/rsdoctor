import { defineConfig } from '@rslib/core';

const BUILD_TARGET = 'es2020' as const;

export const baseBuildConfig = defineConfig({
  lib: [
    {
      bundle: false,
      format: 'cjs' as const,
      syntax: BUILD_TARGET,
      dts: true,
    },
  ],
});

export default baseBuildConfig;

export const configWithEsm = defineConfig({
  lib: [
    {
      bundle: false,
      format: 'cjs',
      syntax: BUILD_TARGET,
      output: {
        distPath: {
          root: './dist/cjs',
        },
      },
      dts: {
        distPath: './dist/type',
      },
    },
    {
      bundle: false,
      format: 'esm',
      syntax: BUILD_TARGET,
      output: {
        distPath: {
          root: './dist/esm',
        },
      },
      dts: false,
    },
  ],
});
