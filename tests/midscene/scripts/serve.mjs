import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { RsdoctorRspackPlugin } from '../../../packages/core/dist/index.js';

const require = createRequire(
  new URL('../../../packages/core/package.json', import.meta.url),
);
const { rspack } = require('@rspack/core');
const fixture = fileURLToPath(new URL('../.fixture/', import.meta.url));
const output = path.join(fixture, 'dist');
await mkdir(fixture, { recursive: true });
await writeFile(
  path.join(fixture, 'small.js'),
  "import data from './small-data.js'; window.small = data;",
);
await writeFile(
  path.join(fixture, 'large.js'),
  "import data from './large-data.js'; window.large = data;",
);
await writeFile(
  path.join(fixture, 'small-data.js'),
  'export default ' + JSON.stringify('s'.repeat(2048)) + ';',
);
await writeFile(
  path.join(fixture, 'large-data.js'),
  'export default ' + JSON.stringify('l'.repeat(2 * 1024 * 1024)) + ';',
);
const compiler = rspack({
  context: fixture,
  mode: 'none',
  entry: { small: './small.js', large: './large.js' },
  output: { path: output, filename: '[name].js' },
  devtool: 'source-map',
  optimization: { minimize: false, concatenateModules: false },
  plugins: [
    new RsdoctorRspackPlugin({
      disableClientServer: true,
      output: { mode: 'brief' },
    }),
  ],
});
await new Promise((resolve, reject) =>
  compiler.run((error, stats) => {
    if (error || !stats || stats.hasErrors())
      reject(error ?? new Error(stats?.toString()));
    else resolve(stats);
  }),
);
await new Promise((resolve, reject) =>
  compiler.close((error) => (error ? reject(error) : resolve())),
);
const report = await readFile(path.join(output, 'rsdoctor-report.html'));
const server = createServer((request, response) => {
  if (request.url?.split('?')[0] !== '/') {
    response.writeHead(404).end('Not found');
    return;
  }
  response
    .writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    .end(report);
});
server.listen(4174, '127.0.0.1', () =>
  console.log('Rsdoctor fixture ready at http://127.0.0.1:4174'),
);
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => server.close(() => process.exit()));
