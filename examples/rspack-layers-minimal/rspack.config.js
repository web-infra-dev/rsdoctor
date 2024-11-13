const rspack = require('@rspack/core');
const ReactRefreshPlugin = require('@rspack/plugin-react-refresh');
const { RsdoctorRspackPlugin } = require('@rsdoctor/rspack-plugin');

/** @type {import('@rspack/cli').Configuration} */
const config = {
  entry: {
    main: {
      import: './src/index.tsx',
      layer: 'modern',
    },
    legacy: {
      import: './src/index.tsx',
      layer: 'legacy',
    },
  },
  module: {
    rules: [
      {
        test: /\.less$/,
        use: 'less-loader',
        type: 'css',
      },
      {
        test: /\.module\.less$/,
        use: 'less-loader',
        type: 'css/module',
      },
      {
        test: /\.svg$/,
        use: '@svgr/webpack',
      },
      {
        test: /\.(jsx?|tsx?)$/,
        issuerLayer: 'modern',
        use: [
          {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                  tsx: true,
                },
                transform: {
                  react: {
                    runtime: 'automatic',
                  },
                },
              },
              env: {
                targets: ['Chrome >= 10'],
              },
            },
          },
        ],
      },
      {
        test: /\.(jsx?|tsx?)$/,
        issuerLayer: 'legacy',
        use: [
          {
            loader: './legacy-loader.js',
          },
          {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                  tsx: true,
                },
                transform: {
                  react: {
                    runtime: 'automatic',
                  },
                },
              },
              env: {
                targets: ['Chrome >= 100'],
              },
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: 'builtin:lightningcss-loader',
            options: {
              targets: 'ie 10',
            },
          },
        ],
      },
      {
        test: /\.svg$/,
        type: 'asset/resource',
      },
    ],
  },
  resolve: {
    extensions: ['...', '.tsx', '.ts', '.jsx'], // "..." means to extend from the default extensions
  },
  plugins: [
    new ReactRefreshPlugin(),
    new RsdoctorRspackPlugin({
      disableClientServer: process.env.ENABLE_CLIENT_SERVER === 'false',
      features: ['bundle', 'plugins', 'loader'],
    }),
    new rspack.HtmlRspackPlugin({
      template: './index.html',
    }),
    new rspack.CopyRspackPlugin({
      patterns: [
        {
          from: 'public',
        },
      ],
    }),
  ],
  experiments: {
    css: true,
    layers: true,
  },
};
module.exports = config;
