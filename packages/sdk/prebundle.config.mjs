export default {
  dependencies: ['cors', 'dayjs', 'fs-extra'],
  exclude: [
    '@rsdoctor/client',
    '@rsdoctor/types',
    '@rsdoctor/core',
    'safer-buffer',
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
