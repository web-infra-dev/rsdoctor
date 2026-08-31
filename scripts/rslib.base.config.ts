import { defineConfig, type LibConfig } from '@rslib/core';
import { pluginPublint } from 'rsbuild-plugin-publint';

export const pluginsConfig = [pluginPublint()];

const nodeMinifyConfig = {
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
  syntax: ['node 20'],
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

export const esmPackage = defineConfig({
  lib: [esmConfig],
  plugins: pluginsConfig,
});
