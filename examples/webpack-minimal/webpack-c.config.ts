import { resolve } from 'path';
import { Configuration } from 'webpack';
import { RsdoctorWebpackPlugin } from '@rsdoctor/webpack-plugin';
import svgToMiniDataURI from 'mini-svg-data-uri';

const data: Configuration = {
  entry: './src/deps/a.js',
  mode: 'none',

  resolve: {
    mainFields: ['browser', 'module', 'main'],
    extensions: ['.ts', '.js', '.json', '.wasm'],
  },
  output: {
    path: resolve(__dirname, 'dist'),
    filename: 'deps.js',
  },
  devtool: 'source-map',
  plugins: [
    new RsdoctorWebpackPlugin({
      disableClientServer: !process.env.ENABLE_CLIENT_SERVER,
      features: ['bundle'],
    }),
  ],
};

export default data;
