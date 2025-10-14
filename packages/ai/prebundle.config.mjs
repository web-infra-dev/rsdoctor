/** @type {import('prebundle').Config} */
export default {
  dependencies: ['socket.io-client'],
  exclude: ['@rsdoctor/types', '@rsdoctor/utils'],

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
    extensions: ['.js', '.json', '.ts', '.tsx', '.cjs'],
  },
};
