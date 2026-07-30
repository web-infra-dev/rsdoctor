import { describe, expect, it } from '@rstest/core';
import fs from 'node:fs';
import path from 'node:path';

const packageRoot = path.resolve(__dirname, '..');
const packageJson = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf-8'),
) as {
  bin?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

const dependencyFields = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const;

const forbiddenDirectDependencies = ['@rspack/core', '@rsdoctor/client'];

const collectFiles = (dir: string): string[] => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const filePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return collectFiles(filePath);
    }

    if (!filePath.endsWith('.ts') || filePath.endsWith('.test.ts')) {
      return [];
    }

    return [filePath];
  });
};

describe('cli package boundary', () => {
  it('keeps rsdoctor as the command entry', () => {
    expect(packageJson.bin?.rsdoctor).toBe('./bin/rsdoctor');
  });

  it('does not directly depend on rspack or client packages', () => {
    for (const field of dependencyFields) {
      for (const dependency of forbiddenDirectDependencies) {
        expect(packageJson[field]?.[dependency]).toBeUndefined();
      }
    }
  });

  it('does not import rspack or client packages from runtime source', () => {
    const offenders = collectFiles(path.join(packageRoot, 'src'))
      .map((filePath) => {
        const source = fs.readFileSync(filePath, 'utf-8');
        const dependency = forbiddenDirectDependencies.find((item) =>
          source.includes(item),
        );

        return dependency
          ? `${path.relative(packageRoot, filePath)} imports ${dependency}`
          : null;
      })
      .filter(Boolean);

    expect(offenders).toEqual([]);
  });
});
