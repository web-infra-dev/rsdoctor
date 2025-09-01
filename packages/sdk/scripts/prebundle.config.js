import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    'tapable',
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
    dir: path.join(__dirname, '../dist/prebundle'),
    filename: '[name].js',
  },

  // Resolve configuration
  resolve: {
    extensions: ['.js', '.json', '.ts', '.tsx'],
  },
};
