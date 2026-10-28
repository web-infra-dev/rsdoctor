import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeAssertions } from './speed-cases.mjs';

test('only adjacent assertions move into an action, preserving input and file options', () => {
  const source = [
    { 'app.open': {} },
    { aiAssert: 'initial state' },
    {
      aiAct: {
        prompt: 'upload',
        options: { fileChooserAccept: 'fixture.json' },
      },
    },
    { aiAssert: 'uploaded state' },
    { 'fixture.update': {} },
    { aiAssert: 'updated state' },
  ];
  const saved = structuredClone(source);
  const result = mergeAssertions(source);
  assert.equal(result.merged, 1);
  assert.equal(result.steps[1].aiAssert, 'initial state');
  assert.match(result.steps[2].aiAct.prompt, /uploaded state/);
  assert.deepEqual(result.steps[2].aiAct.options, {
    fileChooserAccept: 'fixture.json',
  });
  assert.equal(result.steps[4].aiAssert, 'updated state');
  assert.deepEqual(source, saved);
});

test('consecutive assertions are preserved in one prompt', () => {
  const result = mergeAssertions([
    { aiAct: 'select' },
    { aiAssert: 'A' },
    { aiAssert: 'B' },
  ]);
  assert.equal(result.merged, 2);
  assert.equal(result.steps.length, 1);
  assert.match(result.steps[0].aiAct, /\nA\n/);
  assert.match(result.steps[0].aiAct, /\nB\n/);
});

test('priority ordering preserves every case and independent assertion', async (t) => {
  const { mkdtemp, mkdir, writeFile, readFile, rm } =
    await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const yaml = createRequire(require.resolve('@midscene/test'))('js-yaml');
  const { prepareSpeedCases } = await import('./speed-cases.mjs');
  const root = await mkdtemp(path.join(tmpdir(), 'rsdoctor-case-order-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'cases'));
  const cases = ['FAST-01', 'SLOW-01', 'OTHER-01'].map((id) => ({
    name: `${id} original`,
    steps: [{ aiAct: 'Open the page' }, { aiAssert: 'Expected content' }],
  }));
  await writeFile(path.join(root, 'cases/all.yaml'), yaml.dump({ cases }));
  const prepared = await prepareSpeedCases({
    root,
    merge: false,
    priorityIds: ['SLOW-01'],
  });
  const ordered = [...prepared.manifest].sort((a, b) =>
    a.generated.localeCompare(b.generated),
  );
  assert.deepEqual(
    ordered.map((item) => item.name),
    ['SLOW-01 original', 'FAST-01 original', 'OTHER-01 original'],
  );
  for (const item of ordered) {
    const document = yaml.load(
      await readFile(
        path.join(root, path.dirname(prepared.pattern), item.generated),
        'utf8',
      ),
    );
    assert.deepEqual(document.cases, [
      cases.find((source) => source.name === item.name),
    ]);
    assert.equal(item.mergedAssertions, 0);
  }
});
