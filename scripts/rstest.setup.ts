import path from 'node:path';
import { expect } from '@rstest/core';
import { createSnapshotSerializer } from '@scripts/test-helper';

expect.addSnapshotSerializer(
  createSnapshotSerializer({
    workspace: path.join(__dirname, '..'),
  }),
);
