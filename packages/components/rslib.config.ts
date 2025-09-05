import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';
import { pluginSvgr } from '@rsbuild/plugin-svgr';
import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      bundle: false,
      syntax: 'es2020',
      source: {
        entry: {
          index: ['./src/**'],
        },
      },
      dts: true,
      output: {
        target: 'web',
        sourceMap: true,
      },
      plugins: [
        pluginReact(),
        pluginSvgr({
          svgrOptions: {
            exportType: 'default',
          },
        }),
        pluginSass(),
      ],
    },
  ],
});
