const rspack = require('@rspack/core');
const ReactRefreshPlugin = require('@rspack/plugin-react-refresh');
const { RsdoctorRspackPlugin } = require('@rsdoctor/rspack-plugin');

/** @type {import('@rspack/cli').Configuration} */
const config = {
  entry: {
    main: './src/index.tsx',
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
        test: /\.tsx$/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
                jsx: true,
              },
              externalHelpers: true,
              preserveAllComments: false,
              transform: {
                react: {
                  runtime: 'automatic',
                  throwIfNamespace: true,
                  useBuiltins: false,
                },
              },
            },
          },
        },
        type: 'javascript/auto',
      },
      {
        test: /\.ts$/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
              },
              externalHelpers: true,
              preserveAllComments: false,
            },
          },
        },
        type: 'javascript/auto',
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
      mode: 'brief',
      linter: {
        rules: {
          'ecma-version-check': [
            'Warn',
            {
              ecmaVersion: 3,
            },
          ],
        },
      },
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
  },
};
module.exports = config;
