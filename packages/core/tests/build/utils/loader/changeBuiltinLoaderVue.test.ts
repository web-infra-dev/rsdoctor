import { describe, it, expect } from 'vitest';
import os from 'os';
import { Plugin } from '@rsdoctor/types';
import { addProbeLoader2Rules } from '@/build-utils/build/utils';

const rules = [
  {
    test: /\.less$/,
    use: 'less-loader',
    type: 'css',
  },
  {
    test: /\.module\.less$/,
    use: 'less-loader',
    type: 'css/module',
  },
  {
    test: /\.svg$/,
    use: '@svgr/webpack',
  },
  {
    test: /\.vue$/,
    rules: [
      {
        loader: 'vue-loader',
        experimentalInlineMatchResource: true,
      },
    ],
  },
  {
    test: /\.ts$/,
    use: {
      loader: 'builtin:swc-loader',
      options: {
        sourceMap: true,
        jsc: {
          parser: {
            syntax: 'typescript',
          },
          externalHelpers: true,
          preserveAllComments: false,
        },
      },
    },
    type: 'javascript/auto',
  },
  {
    test: /\.svg$/,
    loader: 'svg-loader',
    type: 'asset/resource',
  },
];

const mockCompiler: Plugin.BaseCompiler = {
  options: {
    name: 'test-compiler',
  },
} as Plugin.BaseCompiler;

describe('test addProbeLoader2Rules for vue-loader', () => {
  it('addProbeLoader2Rules()', () => {
    expect(
      addProbeLoader2Rules(
        rules,
        mockCompiler,
        (r: Plugin.BuildRuleSetRule) => !!r.loader || typeof r === 'string',
      ),
    ).toMatchSnapshot();
  });
});

describe('addProbeLoader2Rules', () => {
  const mockCompiler: Plugin.BaseCompiler = {
    options: {
      name: 'test-compiler',
    },
  } as Plugin.BaseCompiler;

  const mockRule = {
    loader: 'mock-loader',
    options: { foo: 'bar' },
  } as {
    loader: string;
    options: any;
    use?: any;
  };

  const mockFn = (rule: Plugin.BuildRuleSetRule) =>
    rule.loader === 'mock-loader';

  it('should add probe loaders to rules', () => {
    const rules = [mockRule];
    const porbeLoaderPath =
      os.EOL === '\n' ? 'build-utils/build/loader/probeLoader' : 'probeLoader';
    const result = addProbeLoader2Rules(rules, mockCompiler, mockFn);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('use');
    expect(result[0].use).toHaveLength(3);
    expect(result[0].use[0]).toHaveProperty('loader');
    expect(result[0].use[0].loader).toContain(porbeLoaderPath);
    expect(result[0].use[0]).toHaveProperty('options.type', 'end');
    expect(result[0].use[1]).toHaveProperty('loader', 'mock-loader');
    expect(result[0].use[2]).toHaveProperty('loader');
    expect(result[0].use[2].loader).toContain(porbeLoaderPath);
    expect(result[0].use[2]).toHaveProperty('options.type', 'start');
  });

  it('should handle nested rules', () => {
    const nestedRule = {
      rules: [mockRule],
    };
    const rules = [nestedRule];
    const result = addProbeLoader2Rules(rules, mockCompiler, mockFn);

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('rules');
    expect(result[0].rules).toHaveLength(1);
    expect(result[0].rules[0]).toHaveProperty('use');
    // @ts-ignore
    expect(result[0].rules[0].use).toHaveLength(3);
  });
});
