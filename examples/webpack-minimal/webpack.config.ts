import { resolve } from 'path';
import { Configuration } from 'webpack';
import { RsdoctorWebpackPlugin } from '@rsdoctor/webpack-plugin';

const data: Configuration = {
  entry: './src/index.ts',
  mode: 'none',
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
      },
    ],
  },
  resolve: {
    mainFields: ['browser', 'module', 'main'],
    extensions: ['.ts', '.js', '.json', '.wasm'],
  },
  output: {
    path: resolve(__dirname, 'dist'),
    filename: 'minimal.js',
  },
  optimization: {
    concatenateModules: true,
    usedExports: true,
    mangleExports: true,
    providedExports: true,
  },
  stats: {
    assets: true,
    warnings: true,
    errors: true,
    modules: true,
    colors: true,
    chunks: true,
    builtAt: true,
    hash: true,
    ids: true,
  },
  devtool: 'source-map',
  plugins: [new RsdoctorWebpackPlugin({
    disableClientServer: !process.env.ENABLE_CLIENT_SERVER,
    features: ['bundle', 'resolver', 'loader', 'plugins']
  })],
};

export default data;
