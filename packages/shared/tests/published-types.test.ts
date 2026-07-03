import { describe, expect, it } from '@rstest/core';
import { execFileSync, type ExecFileSyncOptions } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '../../..');
const sharedRoot = path.resolve(repoRoot, 'packages/shared');
const sharedPackageJsonPath = path.resolve(sharedRoot, 'package.json');
const tscPath = require.resolve('typescript/lib/tsc');

function runTsc(args: string[], options: ExecFileSyncOptions) {
  try {
    execFileSync(process.execPath, [tscPath, ...args], options);
  } catch (error) {
    const result = error as {
      stdout?: Buffer | string;
      stderr?: Buffer | string;
    };

    throw new Error(
      ['tsc failed.', result.stdout?.toString(), result.stderr?.toString()]
        .filter(Boolean)
        .join('\n'),
    );
  }
}

function linkDependency(
  consumerNodeModules: string,
  packageName: string,
  packageRoot: string,
) {
  const segments = packageName.split('/');
  const target = path.join(consumerNodeModules, ...segments);

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.symlinkSync(packageRoot, target, 'junction');
}

function installSharedDependencies(consumerNodeModules: string) {
  const sharedPackageJson = JSON.parse(
    fs.readFileSync(sharedPackageJsonPath, 'utf-8'),
  ) as {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  };
  const packages = [
    ...Object.keys(sharedPackageJson.dependencies ?? {}),
    ...Object.keys(sharedPackageJson.peerDependencies ?? {}),
  ];

  for (const packageName of packages) {
    const dependencyPackageJsonPath = require.resolve(
      `${packageName}/package.json`,
      {
        paths: [sharedRoot],
      },
    );

    linkDependency(
      consumerNodeModules,
      packageName,
      path.dirname(dependencyPackageJsonPath),
    );
  }
}

function installSharedPackage(consumerNodeModules: string) {
  const packageRoot = path.join(consumerNodeModules, '@rsdoctor/shared');

  fs.mkdirSync(packageRoot, { recursive: true });
  fs.copyFileSync(
    sharedPackageJsonPath,
    path.join(packageRoot, 'package.json'),
  );
  fs.cpSync(path.join(sharedRoot, 'dist'), path.join(packageRoot, 'dist'), {
    recursive: true,
  });
}

describe('@rsdoctor/shared published declarations', () => {
  it('resolves exported types in a consumer without extra dependencies', () => {
    const consumerRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'rsdoctor-shared-types-consumer-'),
    );

    try {
      const consumerNodeModules = path.join(consumerRoot, 'node_modules');

      fs.mkdirSync(consumerNodeModules, { recursive: true });
      installSharedPackage(consumerNodeModules);
      installSharedDependencies(consumerNodeModules);
      fs.writeFileSync(
        path.join(consumerRoot, 'index.ts'),
        "import type { SDK } from '@rsdoctor/shared/types';\n\nconst moduleData = {} as SDK.ModuleData;\nvoid moduleData;\n",
      );
      fs.writeFileSync(
        path.join(consumerRoot, 'package.json'),
        JSON.stringify({ type: 'module' }, null, 2),
      );
      fs.writeFileSync(
        path.join(consumerRoot, 'tsconfig.json'),
        JSON.stringify(
          {
            compilerOptions: {
              module: 'Node16',
              moduleResolution: 'Node16',
              noEmit: true,
              strict: true,
              target: 'ES2022',
            },
            include: ['index.ts'],
          },
          null,
          2,
        ),
      );

      expect(() =>
        runTsc(['-p', consumerRoot], {
          cwd: consumerRoot,
          encoding: 'utf-8',
          stdio: 'pipe',
        }),
      ).not.toThrow();
    } finally {
      fs.rmSync(consumerRoot, { recursive: true, force: true });
    }
  });
});
