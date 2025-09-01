export default {
  // Dependencies to prebundle for better performance
  dependencies: [
    'body-parser',
    'cors',
    'dayjs',
    'fs-extra',
    'json-cycle',
    'open',
    'sirv',
    'socket.io',
    'source-map',
  ],

  // Exclude workspace packages from prebundling
  exclude: [
    '@rsdoctor/client',
    '@rsdoctor/graph',
    '@rsdoctor/types',
    '@rsdoctor/utils',
  ],

  // Build configuration
  build: {
    platform: 'node',
    target: 'node16',
    format: 'cjs',
    minify: false,
    sourcemap: false,
    metafile: false,
    write: true,
  },

  // Output configuration
  output: {
    dir: './compiled',
    filename: '[name].cjs',
  },

  // Resolve configuration
  resolve: {
    extensions: ['.js', '.json', '.ts', '.tsx'],
  },
};
