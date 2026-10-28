import path from 'node:path';
import { appendFile, cp, mkdir, writeFile } from 'node:fs/promises';
import { runTestProject } from '@midscene/test/config';
import { prepareSpeedCases } from './speed-cases.mjs';
const concurrency = Number(process.env.MIDSCENE_SPEED_CONCURRENCY ?? '5');
if (![1, 5, 15].includes(concurrency))
  throw new Error('CI concurrency must be 1, 5, or 15');
process.env.MIDSCENE_SPEED_CONCURRENCY = String(concurrency);
// One case per file gives each concurrent case its own browser context.
const prepared = await prepareSpeedCases({
  root: process.cwd(),
  merge: false,
  // Longest cases first, based on full run 40623972888.
  priorityIds: [
    'BUNDLE-03',
    'BUNDLE-05',
    'EXPLORE-01',
    'BUNDLE-04',
    'BUNDLE-02',
    'EXPLORE-02',
    'EXPLORE-03',
    'REPORT-02',
    'COMPILER-01',
    'BUNDLE-01',
    'REPORT-01',
    'EXPLORE-04',
    'DIFF-01',
  ],
});
// The Action uploads midscene_run and .midscene; retain generated sources there.
await mkdir('midscene_run/case-sources', { recursive: true });
await cp(path.dirname(prepared.pattern), 'midscene_run/case-sources', {
  recursive: true,
});
process.env.MIDSCENE_SPEED_CASES = prepared.pattern;
const active = new Set();
let peak = 0;
const started = performance.now();
const result = await runTestProject({
  configPath: path.resolve('midscene.config.ts'),
  onProgress: (message) => console.log(message),
  onEvent(event) {
    if (event.type === 'document-start') active.add(event.documentId);
    else if (event.type === 'document-end')
      active.delete(event.document.documentId);
    peak = Math.max(peak, active.size);
  },
});
const measurement = {
  model: process.env.MIDSCENE_MODEL_NAME,
  concurrency,
  maxActiveFiles: peak,
  wallMs: performance.now() - started,
  summary: result.summary,
  metrics: result.metrics,
};
await writeFile(
  'midscene_run/ci-measurement.json',
  JSON.stringify(measurement, null, 2),
);
console.log('CI_MEASUREMENT', JSON.stringify(measurement));
if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    `## Execution timing\n\nModel: ${measurement.model}\n\nConfigured concurrency: ${concurrency}; observed peak: ${peak}.\n\nTest execution: ${(measurement.wallMs / 60_000).toFixed(2)} minutes (excluding installation and report deployment).\n\n`,
  );
}
process.exitCode = result.exitCode;
