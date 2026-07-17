import { defineConfig, type LibConfig } from '@rslib/core';
import { pluginPublint } from 'rsbuild-plugin-publint';

const BUILD_TARGET = 'node 16' as const;

export const pluginsConfig = [pluginPublint()];

export const baseBuildConfig = defineConfig({
  lib: [
    {
      bundle: false,
      format: 'esm' as const,
      syntax: [BUILD_TARGET],
      dts: true,
      redirect: {
        dts: {
          extension: true,
        },
      },
    },
  ],
});

export default baseBuildConfig;

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
  syntax: [BUILD_TARGET],
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

export const esmPackageBundleless = defineConfig({
  lib: [
    {
      ...esmConfig,
      bundle: false,
    },
  ],
  plugins: pluginsConfig,
});

export const esmPackage = defineConfig({
  lib: [esmConfig],
  plugins: pluginsConfig,
});
