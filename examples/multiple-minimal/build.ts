import webpack from 'webpack';
import { resolve } from 'path';
import { RsdoctorWebpackMultiplePlugin } from '@rsdoctor/webpack-plugin';
import ArcoWebpackPlugin from '@arco-plugins/webpack-react';

const baseConfig: webpack.Configuration = {
  entry: './src/index.ts',
  mode: 'none',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
      },
      {
        test: /\.less$/,
        use: [
          { loader: 'style-loader' },
          { loader: 'css-loader' },
          { loader: 'less-loader' },
        ],
      },
      {
        test: /\.css$/,
        use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
      },
    ],
  },
  resolve: {
    mainFields: ['browser', 'module', 'main'],
    extensions: ['.tsx', '.ts', '.js', '.json', '.wasm'],
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
    cached: true,
    warnings: true,
    errors: true,
    modules: true,
    colors: true,
    chunks: true,
    builtAt: true,
    hash: true,
  },
  devtool: 'source-map',
};

function webpackBuild(config: webpack.Configuration) {
  return new Promise<void>((resolve) => {
    webpack(config, (err, stats) => {
      if (err) {
        throw err;
      }

      console.log();

      if (stats) {
        console.log(
          stats.toString({
            chunks: false,
            chunkModules: false,
            chunkOrigins: false,
            colors: true,
            modules: false,
            children: false,
          }),
        );
      }

      resolve();
    });
  });
}

async function build() {
  await Promise.all([
    webpackBuild({
      ...baseConfig,
      name: 'Builder 1',
      target: 'web',
      output: {
        path: resolve(__dirname, 'dist'),
        filename: 'web.js',
      },
      plugins: [
        new ArcoWebpackPlugin({
          theme: '@arco-themes/react-arco-pro',
          modifyVars: {
            'arcoblue-6': '#165DFF',
          },
        }),
        new RsdoctorWebpackMultiplePlugin({
          disableClientServer: !process.env.ENABLE_CLIENT_SERVER,
          stage: 0,
        }),
      ],
    }),
    webpackBuild({
      ...baseConfig,
      name: 'Builder 2',
      target: 'node',
      output: {
        path: resolve(__dirname, 'dist/node'),
        filename: 'index.js',
      },
      // resolve: {
      //   alias: {
      //     antd: require.resolve('antd'),
      //     react: require.resolve('react'),
      //     'react-dom': require.resolve('react-dom'),
      //     'react-router-dom': require.resolve('react-router-dom')
      //   }
      // },
      plugins: [
        new RsdoctorWebpackMultiplePlugin({
          disableClientServer: !process.env.ENABLE_CLIENT_SERVER,
          name: 'Builder 2',
          stage: 1,
        }),
      ],
    }),
  ]);
}

build();
