import { defineConfig, type LibConfig } from '@rslib/core';

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

export const nodeMinifyConfig = {
  js: true,
  css: false,
  jsOptions: {
    minimizerOptions: {
      // preserve variable name and disable minify for easier debugging
      mangle: false,
      minify: false,
      compress: true,
    },
  },
};

export const esmConfig: LibConfig = {
  format: 'esm',
  syntax: 'es2021',
  dts: {
    build: true,
  },
  output: {
    minify: nodeMinifyConfig,
    filename: {
      js: '[name].js',
    },
  },
};

export const cjsConfig: LibConfig = {
  format: 'cjs',
  syntax: 'es2021',
  output: {
    minify: nodeMinifyConfig,
    filename: {
      js: '[name].cjs',
    },
  },
};

export const dualPackage = defineConfig({
  lib: [esmConfig, cjsConfig],
});

export const dualPackageBundleless = defineConfig({
  lib: [
    {
      ...esmConfig,
      bundle: false,
    },
    {
      ...cjsConfig,
      bundle: false,
    },
  ],
});
