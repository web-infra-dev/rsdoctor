import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from '@rstest/core';
import { SDK } from '@rsdoctor/types';
import { rule } from '../../src/rules/rules/esm-resolved-to-cjs';

interface RunRuleOptions {
  resolvedModuleFile: string;
  request?: string;
  strictHarmonyModule?: boolean;
  ignore?: string[];
}

async function runRule(options: RunRuleOptions) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rsdoctor-e1009-'));
  const pkgRoot = path.join(tempRoot, 'node_modules', 'up-fetch');
  const distRoot = path.join(pkgRoot, 'dist');
  const resolvedModulePath = path.join(distRoot, options.resolvedModuleFile);
  const reports: any[] = [];

  try {
    fs.mkdirSync(distRoot, { recursive: true });
    fs.writeFileSync(
      path.join(pkgRoot, 'package.json'),
      JSON.stringify(
        {
          name: 'up-fetch',
          version: '2.6.0',
          exports: {
            '.': {
              import: {
                default: './dist/index.js',
              },
              require: {
                default: './dist/index.cjs',
              },
            },
          },
        },
        null,
        2,
      ),
      'utf-8',
    );

    const dependency = {
      kind: SDK.DependencyKind.ImportStatement,
      request: options.request ?? 'up-fetch',
      module: {
        id: 1,
        path: '/project/src/index.js',
        webpackId: '1',
      },
      dependency: {
        id: 2,
        path: resolvedModulePath,
        webpackId: '2',
        meta: {
          strictHarmonyModule: options.strictHarmonyModule ?? false,
        },
      },
    };

    await rule.check({
      moduleGraph: {
        getDependencies: () => [dependency],
      },
      packageGraph: {
        getPackageByModule: () => ({
          name: 'up-fetch',
          version: '2.6.0',
          root: pkgRoot,
        }),
      },
      ruleConfig: {
        ignore: options.ignore ?? [],
      },
      report: (data: any) => {
        reports.push(data);
      },
    } as any);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }

  return { reports, resolvedModulePath };
}

describe('esm-resolved-to-cjs rule', () => {
  it('does not report when resolved module is exactly package ESM entry', async () => {
    const { reports } = await runRule({
      resolvedModuleFile: 'index.js',
    });

    expect(reports).toHaveLength(0);
  });

  it('does not report when resolved module path has query/hash for same ESM entry', async () => {
    const { reports } = await runRule({
      resolvedModuleFile: 'index.js?query=1#hash',
    });

    expect(reports).toHaveLength(0);
  });

  it('reports when resolved module is CJS artifact', async () => {
    const { reports, resolvedModulePath } = await runRule({
      resolvedModuleFile: 'index.cjs',
    });

    expect(reports).toHaveLength(1);
    expect(reports[0].detail.packageName).toBe('up-fetch');
    expect(reports[0].detail.resolvedModule.path).toBe(resolvedModulePath);
  });
});
