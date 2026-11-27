import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'rstack/test';
import { SDK } from '@rsdoctor/shared/types';
import { compileByRspack } from '@scripts/test-helper';
import { RsdoctorRspackPlugin } from '../../src/rspack-plugin';
import { rule } from '../../src/rules/rules/esm-resolved-to-cjs';

interface RunRuleOptions {
  resolvedModuleFile: string;
  request?: string;
  strictHarmonyModule?: boolean;
  ignore?: string[];
  packageJson?: Record<string, unknown>;
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
        options.packageJson ?? {
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
        identifier: '1',
      },
      dependency: {
        id: 2,
        path: resolvedModulePath,
        identifier: '2',
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
  it('only reports the CommonJS entry in a web build with extensionless and browser entries', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rsdoctor-e1009-'));
    const esm = 'export const value = 1;';
    const browserFields = { module: 'index.js', browser: 'web.js' };
    const writePackage = (
      name: string,
      fields: Record<string, unknown>,
      files: Record<string, string>,
    ) => {
      const dir = path.join(root, 'node_modules', name);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'package.json'),
        JSON.stringify({ name, version: '1.0.0', ...fields }),
      );
      for (const [file, source] of Object.entries(files)) {
        fs.writeFileSync(path.join(dir, file), source);
      }
    };

    try {
      writePackage('extensionless', { module: 'index' }, { 'index.js': esm });
      writePackage(
        'wildcard',
        { type: 'module', exports: { './*': './*' } },
        { 'loader.js': esm },
      );
      writePackage('browser-esm', browserFields, {
        'index.js': esm,
        'web.js': esm,
      });
      writePackage('browser-cjs', browserFields, {
        'index.js': esm,
        'web.js':
          "Object.defineProperty(exports, '__esModule', { value: true }); exports.value = 1;",
      });
      fs.writeFileSync(
        path.join(root, 'entry.js'),
        `import { value as a } from 'extensionless';
         import { value as b } from 'wildcard/loader';
         import { value as c } from 'browser-esm';
         import { value as d } from 'browser-cjs';
         console.log(a, b, c, d);`,
      );
      const stats = await compileByRspack(
        './entry.js',
        {
          context: root,
          mode: 'production',
          output: { path: path.join(root, 'dist') },
          plugins: [new RsdoctorRspackPlugin({ disableClientServer: true })],
        },
        { all: false, errors: true, warnings: true },
      );
      const warnings = stats.warnings
        ?.map((warning) => warning.message)
        .filter((message) => message.includes('E1009'));
      expect(warnings).toEqual([expect.stringContaining('"browser-cjs"')]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

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

  it('does not report when resolved module has a definite ESM extension', async () => {
    const { reports } = await runRule({
      resolvedModuleFile: 'nested/index.mjs',
    });

    expect(reports).toHaveLength(0);
  });

  it('does not report when resolved module is an ESM subpath export', async () => {
    const { reports } = await runRule({
      resolvedModuleFile: 'compat/index.js',
      request: 'up-fetch/compat',
      packageJson: {
        name: 'up-fetch',
        version: '2.6.0',
        exports: {
          '.': {
            import: {
              default: './dist/index.mjs',
            },
            require: {
              default: './dist/index.js',
            },
          },
          './compat': {
            import: {
              default: './dist/compat/index.js',
            },
            require: {
              default: './dist/compat/index.cjs',
            },
          },
        },
      },
    });

    expect(reports).toHaveLength(0);
  });

  it('does not match ESM entries from unrelated subpath exports', async () => {
    const { reports, resolvedModulePath } = await runRule({
      resolvedModuleFile: 'index.cjs',
      request: 'up-fetch',
      packageJson: {
        name: 'up-fetch',
        version: '2.6.0',
        exports: {
          '.': {
            import: {
              default: './dist/index.mjs',
            },
            require: {
              default: './dist/index.cjs',
            },
          },
          './compat': {
            import: {
              default: './dist/index.cjs',
            },
          },
        },
      },
    });

    expect(reports).toHaveLength(1);
    expect(reports[0].detail.resolvedModule.path).toBe(resolvedModulePath);
  });

  it('does not report when resolved module matches an ESM subpath export pattern', async () => {
    const { reports } = await runRule({
      resolvedModuleFile: 'compat.js',
      request: 'up-fetch/compat',
      packageJson: {
        name: 'up-fetch',
        version: '2.6.0',
        exports: {
          './*': {
            import: {
              default: './dist/*.js',
            },
            require: {
              default: './dist/*.cjs',
            },
          },
        },
      },
    });

    expect(reports).toHaveLength(0);
  });

  it('reports when a subpath export pattern resolves to CJS instead of ESM', async () => {
    const { reports, resolvedModulePath } = await runRule({
      resolvedModuleFile: 'compat.cjs',
      request: 'up-fetch/compat',
      packageJson: {
        name: 'up-fetch',
        version: '2.6.0',
        exports: {
          './*': {
            import: {
              default: './dist/*.mjs',
            },
            require: {
              default: './dist/*.cjs',
            },
          },
        },
      },
    });

    expect(reports).toHaveLength(1);
    expect(reports[0].detail.resolvedModule.path).toBe(resolvedModulePath);
    expect(reports[0].detail.esmEntry).toContain(`${path.sep}compat.mjs`);
  });
});
