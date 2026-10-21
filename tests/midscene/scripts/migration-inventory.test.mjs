import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('replacement inventory keeps technical contracts and removes duplicate filter paths', async () => {
  const inventory = JSON.parse(
    await readFile(new URL('../migration-inventory.json', import.meta.url)),
  );
  const manifest = JSON.parse(
    await readFile(new URL('../case-manifest.json', import.meta.url)),
  );
  const ids = new Set(Object.keys(manifest).map((name) => name.split(' ')[0]));
  assert.equal(inventory.cases.length, 28);
  const replaced = inventory.cases.filter(
    (entry) => entry.replacementStatus === 'replaced-by-midscene',
  );
  assert.equal(replaced.length, 4);
  for (const entry of replaced) {
    assert(entry.candidateCaseIds.length > 0);
    for (const id of entry.candidateCaseIds) assert(ids.has(id));
  }
  const filters = await readFile(
    new URL(
      '../../../e2e/cases/doctor-rspack/size-filter.test.ts',
      import.meta.url,
    ),
    'utf8',
  );
  assert(!filters.includes('unit-first'));
  assert(!filters.includes('value-first'));
  assert(filters.includes('pending-input'));
  assert(filters.includes('page.clock.pauseAt'));
  assert(filters.includes('page.clock.runFor(350)'));
  const diff = await readFile(
    new URL(
      '../../../e2e/cases/doctor-rspack/bundle-diff.test.ts',
      import.meta.url,
    ),
    'utf8',
  );
  assert(diff.includes('bundle diff CLI serves a real manifest'));
  assert(diff.includes('escapes Windows paths in manifest JSON'));
  assert(!diff.includes('page.'));
});
