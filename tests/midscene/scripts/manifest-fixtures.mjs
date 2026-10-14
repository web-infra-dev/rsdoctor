import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { RsdoctorRspackPlugin } from '../../../packages/core/dist/index.js';

const require = createRequire(
  new URL('../../../packages/core/package.json', import.meta.url),
);
const { rspack } = require('@rspack/core');

async function buildBriefManifest(fixture, entryName, directory) {
  const output = path.join(fixture, directory);
  const compiler = rspack({
    context: fixture,
    mode: 'none',
    entry: { [entryName]: './small.js' },
    output: { path: output, filename: '[name].js' },
    optimization: { minimize: false },
    plugins: [
      new RsdoctorRspackPlugin({
        disableClientServer: true,
        output: { mode: 'brief', options: { type: ['json'] } },
      }),
    ],
  });
  try {
    await new Promise((resolve, reject) =>
      compiler.run((error, stats) => {
        if (error || !stats || stats.hasErrors())
          reject(error ?? new Error(stats?.toString()));
        else resolve(stats);
      }),
    );
    return JSON.parse(
      await readFile(path.join(output, 'rsdoctor-data.json'), 'utf8'),
    );
  } finally {
    await new Promise((resolve, reject) =>
      compiler.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

export const buildDiffFixture = (fixture) =>
  buildBriefManifest(fixture, 'small', 'diff');
export const buildUploadFixture = (fixture) =>
  buildBriefManifest(fixture, 'uploaded-only', 'upload');
