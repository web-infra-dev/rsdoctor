import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldSkipCI, shouldSkipFile } from './skipCI.js';

describe('skipCI', () => {
  it('recognizes documentation files and paths', () => {
    assert.equal(shouldSkipFile('README.md'), true);
    assert.equal(shouldSkipFile('packages/core/README.mdx'), true);
    assert.equal(shouldSkipFile('packages/document/docs/en/index.tsx'), true);
    assert.equal(shouldSkipFile('packages/documentation/index.tsx'), false);
  });

  it('skips CI only when every changed file is skippable', () => {
    assert.equal(
      shouldSkipCI([
        'packages/document/docs/en/index.mdx',
        'packages/core/README.md',
      ]),
      true,
    );
    assert.equal(
      shouldSkipCI([
        'packages/document/docs/en/index.mdx',
        'packages/core/src/index.ts',
      ]),
      false,
    );
    assert.equal(shouldSkipCI([]), false);
  });
});
