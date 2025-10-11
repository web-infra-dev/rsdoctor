import { resolve } from 'path';
import { Configuration } from 'webpack';
import { RsdoctorWebpackPlugin } from '@rsdoctor/webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import svgToMiniDataURI from 'mini-svg-data-uri';

const data: Configuration = {
  entry: './src/index.ts',
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.(png|jpg)$/,
        type: 'asset',
      },
      {
        test: /\.svg$/,
        type: 'asset',
        generator: {
          dataUrl: (content: any) => {
            if (typeof content !== 'string') {
              content = content.toString();
            }

            return svgToMiniDataURI(content);
          },
        },
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
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css',
      chunkFilename: '[name].chunk.css',
    }),
    new RsdoctorWebpackPlugin({
      disableClientServer: !process.env.ENABLE_CLIENT_SERVER,
      features: ['bundle', 'plugins', 'loader', 'resolver'],
    }),
  ],
};

export default data;
