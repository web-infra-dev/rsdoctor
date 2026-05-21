import { describe, expect, it } from '@rstest/core';
import { rule } from '../../src/rules/rules/cjs-require';

interface RunRuleOptions {
  issuerPath: string;
  requiredPath: string;
  typeString?: string;
  ignore?: string[];
}

async function runRule(options: RunRuleOptions) {
  const {
    issuerPath,
    requiredPath,
    typeString = 'cjs require',
    ignore = [],
  } = options;

  const reports: any[] = [];

  const dependency = {
    typeString,
    request: 'some-package',
    module: {
      id: 1,
      path: issuerPath,
      webpackId: '1',
    },
    dependency: {
      id: 2,
      path: requiredPath,
      webpackId: '2',
    },
  };

  await rule.check({
    moduleGraph: {
      getDependencies: () => [dependency],
    },
    ruleConfig: {
      ignore,
    },
    report: (data: any) => {
      reports.push(data);
    },
  } as any);

  return reports;
}

describe('cjs-require rule', () => {
  it('reports user-code require from node_modules by default', async () => {
    const reports = await runRule({
      issuerPath: '/project/src/index.js',
      requiredPath: '/project/node_modules/some-package/index.js',
    });

    expect(reports).toHaveLength(1);
    expect(reports[0].detail.issuerModule.path).toBe('/project/src/index.js');
    expect(reports[0].detail.requiredModule.path).toBe(
      '/project/node_modules/some-package/index.js',
    );
  });

  it('skips when issuer is in node_modules (posix path)', async () => {
    const reports = await runRule({
      issuerPath: '/project/node_modules/pkg/index.js',
      requiredPath: '/project/node_modules/some-package/index.js',
    });

    expect(reports).toHaveLength(0);
  });

  it('skips when issuer is in node_modules (windows path)', async () => {
    const reports = await runRule({
      issuerPath: 'C:\\project\\node_modules\\pkg\\index.js',
      requiredPath: 'C:\\project\\node_modules\\some-package\\index.js',
    });

    expect(reports).toHaveLength(0);
  });

  it('still supports ignore filtering on required module path', async () => {
    const reports = await runRule({
      issuerPath: '/project/src/index.js',
      requiredPath: '/project/node_modules/some-package/index.js',
      ignore: ['some-package'],
    });

    expect(reports).toHaveLength(0);
  });
});
