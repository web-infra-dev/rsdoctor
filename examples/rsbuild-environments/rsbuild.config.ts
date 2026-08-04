import { defineConfig } from '@rsbuild/core';
import { RsdoctorRspackPlugin } from '@rsdoctor/core';

export default defineConfig({
  tools: {
    rspack: (_config, { appendPlugins }) => {
      appendPlugins(
        new RsdoctorRspackPlugin({
          disableClientServer: !process.env.ENABLE_CLIENT_SERVER,
          output: {
            reportDir: './dist',
          },
        }),
      );
    },
  },
  environments: {
    web: {
      source: {
        entry: {
          web: './src/web.js',
        },
      },
      output: {
        target: 'web',
        distPath: {
          root: 'dist/web',
        },
        filenameHash: false,
      },
    },
    node: {
      source: {
        entry: {
          node: './src/node.js',
        },
      },
      output: {
        target: 'node',
        distPath: {
          root: 'dist/node',
        },
        filenameHash: false,
      },
    },
  },
});
