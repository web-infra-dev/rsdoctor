const path = require('node:path');
const rspack = require('@rspack/core');
const { RsdoctorRspackPlugin } = require('@rsdoctor/core/rspack-plugin');

class ChildCompilerExamplePlugin {
  apply(compiler) {
    compiler.hooks.make.tapAsync(
      'ChildCompilerExamplePlugin',
      (compilation, callback) => {
        const childCompiler = compilation.createChildCompiler(
          'child-assets',
          {
            filename: 'child-assets.js',
          },
          [
            new rspack.EntryPlugin(
              compiler.context,
              path.resolve(__dirname, 'src/child.js'),
              {
                name: 'child-assets',
              },
            ),
          ],
        );

        childCompiler.runAsChild((error) => callback(error));
      },
    );
  }
}

/** @type {import('@rspack/cli').Configuration} */
module.exports = {
  context: __dirname,
  mode: 'development',
  entry: {
    main: './src/main.js',
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /main\.js$/,
        loader: path.resolve(__dirname, 'loaders/main-loader.js'),
      },
      {
        test: /child\.js$/,
        loader: path.resolve(__dirname, 'loaders/child-loader.js'),
      },
    ],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  optimization: {
    minimize: false,
  },
  plugins: [
    new RsdoctorRspackPlugin({
      disableClientServer: process.env.ENABLE_CLIENT_SERVER === 'false',
      features: ['bundle', 'loader'],
      supports: {
        parseBundle: false,
      },
    }),
    new ChildCompilerExamplePlugin(),
  ],
};
