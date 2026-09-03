import path from 'node:path';
import { expect } from 'rstack/test';
import { createSnapshotSerializer } from '@scripts/test-helper';

const repoRoot = path.join(__dirname, '../..');

process.chdir(repoRoot);

expect.addSnapshotSerializer(
  createSnapshotSerializer({
    workspace: repoRoot,
  }),
);
