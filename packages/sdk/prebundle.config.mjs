export default {
  dependencies: ['body-parser', 'cors', 'dayjs', 'fs-extra', 'json-cycle'],
  exclude: [
    '@rsdoctor/client',
    '@rsdoctor/graph',
    '@rsdoctor/types',
    '@rsdoctor/utils',
    '@types/body-parser',
    '@types/connect',
  ],

  build: {
    platform: 'node',
    target: 'node16',
    format: 'cjs',
    minify: false,
    sourcemap: false,
    metafile: false,
    write: true,
    output: {
      chunkFormat: 'commonjs',
    },
    environment: {
      node: true,
    },
  },

  output: {
    dir: './compiled',
    filename: '[name].cjs',
  },

  resolve: {
    extensions: ['.js', '.json', '.ts', '.tsx'],
  },
};
