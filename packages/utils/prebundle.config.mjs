export default {
  dependencies: ['connect', 'filesize'],
  exclude: ['@rsdoctor/types'],

  build: {
    platform: 'node',
    target: 'node16',
    format: 'cjs',
    minify: false,
    sourcemap: false,
    metafile: false,
    write: true,
  },

  output: {
    dir: './compiled',
    filename: '[name].cjs',
  },

  resolve: {
    extensions: ['.js', '.json', '.ts', '.tsx'],
  },
};
