import { expect, test } from '@test-kit/rstest';
import { execute } from '@rsdoctor/cli';
import fs from 'node:fs';
import path from 'node:path';

// @ts-ignore
process.stderr.clearLine = () => {};
// @ts-ignore
process.stderr.cursorTo = () => {};
// @ts-ignore
process.stderr.moveCursor = () => {};

function serializeManifestWithReplacedPaths(
  manifest: string,
  oldPath: string,
  newPath: string,
) {
  return JSON.stringify(
    JSON.parse(manifest),
    (_key, value) =>
      typeof value === 'string' ? value.replaceAll(oldPath, newPath) : value,
    2,
  );
}

test('escapes Windows paths in manifest JSON', () => {
  const oldPath = '<root>/rsdoctor';
  const newPath = String.raw`C:\workspace\rsdoctor`;
  const manifest = JSON.stringify({
    root: oldPath,
    files: [`${oldPath}/index.js`],
  });

  const updatedManifest = serializeManifestWithReplacedPaths(
    manifest,
    oldPath,
    newPath,
  );

  expect(JSON.parse(updatedManifest)).toEqual({
    root: newPath,
    files: [`${newPath}/index.js`],
  });
});

test('bundle diff CLI serves a real manifest', async () => {
  // Usage
  const manifestPath = path.resolve(
    __dirname,
    '../../fixtures/rsdoctor/manifest.json',
  );
  const oldPath = '<root>/rsdoctor';
  const newPath = path.resolve(__dirname, '../../../');
  const originalManifest = fs.readFileSync(manifestPath, 'utf-8');

  fs.writeFileSync(
    manifestPath,
    serializeManifestWithReplacedPaths(originalManifest, oldPath, newPath),
    'utf-8',
  );

  let dispose: (() => Promise<void>) | undefined;

  try {
    const sdk = await execute('bundle-diff', {
      baseline: manifestPath,
      current: manifestPath,
      open: false,
    });
    if (!sdk) throw new Error('Bundle diff did not start a server.');
    dispose = () => sdk.dispose();
    const response = await fetch(
      `${sdk.server.origin}/api/bundle_diff/manifest.json`,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toBeTruthy();
  } finally {
    fs.writeFileSync(manifestPath, originalManifest, 'utf-8');
    await dispose?.();
  }
});
