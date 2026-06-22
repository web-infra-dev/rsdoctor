import { describe, expect, it } from '@rstest/core';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import packageJson from '../package.json';

const packageRoot = path.resolve(__dirname, '..');

describe('agent-cli pack', () => {
  it('build emits the declaration entry referenced by package.json', () => {
    execSync('pnpm run build', {
      cwd: packageRoot,
      stdio: 'pipe',
    });

    const typesEntry = packageJson.types;
    expect(typeof typesEntry).toBe('string');

    const typesPath = path.resolve(packageRoot, typesEntry);
    expect(fs.existsSync(typesPath)).toBe(true);
  });

  it('includes declaration file in npm pack output', () => {
    execSync('pnpm run build', {
      cwd: packageRoot,
      stdio: 'pipe',
    });

    const packOutput = execSync('npm pack --dry-run --json', {
      cwd: packageRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const packedFiles = (JSON.parse(packOutput)[0]?.files ?? []).map(
      (file: { path: string }) => file.path,
    );

    expect(packedFiles).toContain('dist/index.d.ts');
  });
});
