const rspack = require('@rspack/core');
const ReactRefreshPlugin = require('@rspack/plugin-react-refresh');
const { RsdoctorRspackPlugin } = require('@rsdoctor/rspack-plugin');

const banner = `var a = 111111111111111; console.log(a)`;

/** @type {import('@rspack/cli').Configuration} */
const config = {
  entry: {
    main: './src/index.tsx',
  },
  devtool: 'source-map',
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
        test: /\.svg$/,
        type: 'asset/resource',
      },
    ],
  },
  resolve: {
    extensions: ['...', '.tsx', '.ts', '.jsx'], // "..." means to extend from the default extensions
  },
  optimization: {
    minimize: true,
  },
  experiments: {
    css: true,
  },
  // stats: 'verbose',
  plugins: [
    new ReactRefreshPlugin(),
    new RsdoctorRspackPlugin({
      disableClientServer: process.env.ENABLE_CLIENT_SERVER === 'false',
      features: ['bundle', 'plugins', 'resolver', 'loader'],
      supports: {
        banner: false,
      },
    }),
    new rspack.BannerPlugin({
      test: /\.js/,
      banner,
      raw: true,
    }),
    new rspack.HtmlRspackPlugin({
      template: './index.html',
    }),
  ],
};
module.exports = config;
