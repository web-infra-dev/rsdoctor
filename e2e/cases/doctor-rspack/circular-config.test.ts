import { expect, test } from '@test-kit/rstest';
import { compileByRspack } from '@scripts/test-helper';
import { readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'path';
import { createRsdoctorPlugin } from './test-utils';

test('writes the brief JSON report when a loader option references itself', async () => {
  const entry = path.resolve(__dirname, './fixtures/a.js');
  const reportDir = path.join(tmpdir(), `rsdoctor-circular-${Date.now()}`);
  const context: Record<string, unknown> = { type: 'example' };
  context.handle = { context };
  const doctor = createRsdoctorPlugin({
    output: {
      mode: 'brief',
      reportDir,
      options: {
        type: ['json'],
      },
    },
  });

  try {
    await compileByRspack(entry, {
      loader: { context },
      plugins: [doctor],
    });

    const report = JSON.parse(
      await readFile(path.join(reportDir, 'rsdoctor-data.json'), 'utf-8'),
    );

    expect(report.data.configs[0].config.loader.context).toEqual({
      type: 'example',
      handle: { context: { $ref: '$["loader"]["context"]' } },
    });
  } finally {
    await rm(reportDir, { recursive: true, force: true });
  }
});
