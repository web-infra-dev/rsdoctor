export default {
  // Dependencies to prebundle for better performance
  dependencies: ['connect', 'filesize'],

  // Exclude workspace packages from prebundling
  exclude: ['@rsdoctor/types'],

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
