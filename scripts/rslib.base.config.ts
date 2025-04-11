import { defineConfig, type RslibConfig } from '@rslib/core';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const BUILD_TARGET = 'es2020' as const;
const DEFINE = {
  RSDOCTOR_VERSION: require('../packages/core/package.json').version,
};

export const baseBuildConfig: RslibConfig = {
  lib: [
    {
      bundle: false,
      dts: {
        bundle: false,
      },
      format: 'cjs',
      syntax: BUILD_TARGET,
      source: {
        define: DEFINE,
      },
    },
  ],
};

export default defineConfig(baseBuildConfig);

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
        distPath: './dist/types',
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
    },
  ],
});
