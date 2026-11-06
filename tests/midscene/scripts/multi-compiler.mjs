import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { RsdoctorRspackPlugin } from '../../../packages/core/dist/index.js';

const require = createRequire(
  new URL('../../../scripts/test-helper/package.json', import.meta.url),
);
const { createRsbuild } = require('@rsbuild/core');

export async function buildMultiCompilerFixture(fixture) {
  const workdir = path.join(fixture, 'multi-build');
  await mkdir(workdir, { recursive: true });
  const reportDir = path.join(fixture, 'multi-reports');
  const entry = fileURLToPath(
    new URL(
      '../../../e2e/cases/doctor-rsbuild/fixtures/multi-entry.js',
      import.meta.url,
    ),
  );
  const rsbuild = await createRsbuild({
    cwd: workdir,
    rsbuildConfig: {
      environments: {
        web: { source: { entry: { index: entry } }, output: { target: 'web' } },
        node: {
          source: { entry: { index: entry } },
          output: { target: 'node' },
        },
      },
      tools: {
        rspack(_config, { appendPlugins }) {
          appendPlugins(
            new RsdoctorRspackPlugin({
              disableClientServer: true,
              output: { mode: 'brief', reportDir, options: { type: ['html'] } },
            }),
          );
        },
      },
    },
  });
  await rsbuild.build();
  return new Map([
    [
      '/multi/rsdoctor-report.html',
      await readFile(path.join(reportDir, 'rsdoctor-report.html')),
    ],
    [
      '/multi/compilers/node/rsdoctor-report.html',
      await readFile(
        path.join(reportDir, 'compilers/node/rsdoctor-report.html'),
      ),
    ],
  ]);
}
