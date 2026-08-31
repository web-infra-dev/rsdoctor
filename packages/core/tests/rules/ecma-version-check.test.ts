import path from 'node:path';
import { beforeEach, describe, expect, it, rs } from 'rstack/test';

const mocks = rs.hoisted(() => ({
  check: rs.fn(async () => {}),
  loadConfig: rs.fn(),
  options: [] as Record<string, unknown>[],
}));

rs.mock('browserslist-load-config', () => ({
  loadConfig: mocks.loadConfig,
}));

rs.mock('@rsbuild/plugin-check-syntax', () => ({
  CheckSyntax: class {
    errors: unknown[] = [];
    ecmaVersion: number;

    constructor(options: Record<string, unknown>) {
      mocks.options.push(options);
      this.ecmaVersion = (options.ecmaVersion as number | undefined) ?? 5;
    }

    check = mocks.check;
  },
}));

import type { Config } from '../../src/rules/rules/ecma-version-check';
import { rule } from '../../src/rules/rules/ecma-version-check';

const root = path.resolve('/project');
const outputPath = path.join(root, 'dist');

async function runRule(
  ruleConfig: Config,
  assets = [
    { path: 'main.js', content: 'const main = 1;' },
    { path: 'async.bundle', content: 'const asyncChunk = 1;' },
  ],
  context = root,
) {
  const reports: unknown[] = [];

  await rule.check({
    chunkGraph: {
      getAssets: () => assets,
    },
    configs: [
      {
        config: {
          context,
          output: { path: outputPath },
        },
      },
    ],
    report: (data: unknown) => reports.push(data),
    root,
    ruleConfig,
  } as any);

  return reports;
}

beforeEach(() => {
  mocks.check.mockReset();
  mocks.check.mockResolvedValue(undefined);
  mocks.loadConfig.mockReset();
  mocks.options.length = 0;
});

describe('ecma-version-check rule', () => {
  it('falls back to the project Browserslist and resolves it once', async () => {
    mocks.loadConfig.mockReturnValue(['ie 11']);

    await runRule(rule.meta.defaultConfig);

    expect(rule.meta.defaultConfig.targets).toBeUndefined();
    expect(mocks.loadConfig).toHaveBeenCalledTimes(1);
    expect(mocks.loadConfig).toHaveBeenCalledWith({
      path: root,
      env: 'production',
    });
    expect(mocks.options).toHaveLength(1);
    expect(mocks.options[0].targets).toEqual(['ie 11']);
    expect(mocks.check).toHaveBeenCalledTimes(2);
  });

  it('resolves project Browserslist from the build context', async () => {
    const context = path.join(root, 'packages/app');
    mocks.loadConfig.mockReturnValue(['ie 11']);

    await runRule({}, undefined, context);

    expect(mocks.loadConfig).toHaveBeenCalledWith({
      path: context,
      env: 'production',
    });
    expect(mocks.options[0].rootPath).toBe(context);
  });

  it('uses explicit targets without loading project Browserslist', async () => {
    await runRule({ targets: ['chrome >= 80'] });

    expect(mocks.loadConfig).not.toHaveBeenCalled();
    expect(mocks.options[0].targets).toEqual(['chrome >= 80']);
    expect(mocks.check).toHaveBeenCalledTimes(2);
  });

  it('uses an explicit ECMAScript version without loading Browserslist', async () => {
    await runRule({ ecmaVersion: 2019 });

    expect(mocks.loadConfig).not.toHaveBeenCalled();
    expect(mocks.options[0].ecmaVersion).toBe(2019);
    expect(mocks.check).toHaveBeenCalledTimes(2);
  });

  it('preserves an explicit empty targets array as disabled', async () => {
    await runRule({ targets: [] });

    expect(mocks.loadConfig).not.toHaveBeenCalled();
    expect(mocks.options).toHaveLength(0);
    expect(mocks.check).not.toHaveBeenCalled();
  });

  it('skips the rule when neither targets nor ecmaVersion can be resolved', async () => {
    mocks.loadConfig.mockReturnValue(undefined);

    await runRule({});

    expect(mocks.loadConfig).toHaveBeenCalledTimes(1);
    expect(mocks.options).toHaveLength(0);
    expect(mocks.check).not.toHaveBeenCalled();
  });

  it('does not resolve Browserslist when there are no JavaScript assets', async () => {
    await runRule({}, [{ path: 'styles.css', content: '.root {}' }]);

    expect(mocks.loadConfig).not.toHaveBeenCalled();
    expect(mocks.options).toHaveLength(0);
  });

  it('applies output exclusions and forwards error-message exclusions', async () => {
    const excludeErrorMessage = /optional chaining/;
    await runRule({
      ecmaVersion: 5,
      excludeErrorMessage,
      excludeOutput: (filepath) => filepath.endsWith('main.js'),
    });

    expect(mocks.options[0].excludeErrorMessage).toBe(excludeErrorMessage);
    expect(mocks.check).toHaveBeenCalledTimes(1);
    expect(mocks.check).toHaveBeenCalledWith(
      path.join(outputPath, 'async.bundle'),
      'const asyncChunk = 1;',
    );
  });

  it('normalizes string output exclusions', async () => {
    await runRule(
      {
        ecmaVersion: 5,
        excludeOutput: `${outputPath}/nested/`,
      },
      [{ path: 'nested\\main.js', content: 'const main = 1;' }],
    );

    expect(mocks.check).not.toHaveBeenCalled();
  });

  it('resets stateful output exclusion regular expressions', async () => {
    const excludeOutput = /dist\/.*\.(?:js|bundle)$/g;

    await runRule({ ecmaVersion: 5, excludeOutput });

    expect(mocks.check).not.toHaveBeenCalled();
    expect(excludeOutput.lastIndex).toBe(0);
  });
});
