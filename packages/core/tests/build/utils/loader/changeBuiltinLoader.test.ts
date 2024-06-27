import { addProbeLoader2Rules } from '@/build-utils/build/utils/loader';
import { describe, it, expect } from 'vitest';
import { Plugin } from '@rsdoctor/types';
import { Utils } from '@/build-utils/build';

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
    test: /\.tsx$/,
    oneOf: [
      {
        loader: 'builtin:swc-loader',
        options: {
          sourceMap: true,
          jsc: {
            parser: {
              syntax: 'typescript',
              jsx: true,
            },
          },
        },
        type: 'javascript/auto',
      },
    ],
  },
  {
    test: /\.tsx$/,
    rules: [
      {
        loader: 'builtin:swc-loader',
        options: {
          sourceMap: true,
          jsc: {
            parser: {
              syntax: 'typescript',
              jsx: true,
            },
          },
        },
        type: 'javascript/auto',
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
    type: 'asset/resource',
  },
];

const appendRule = (rule: Plugin.RuleSetRule, index: number) => {
  if ('use' in rule && Array.isArray(rule.use)) {
    const _builtinRule = rule.use[index] as Plugin.RuleSetRule;
    const _options =
      typeof _builtinRule.options === 'string' ? {} : { ..._builtinRule };
    rule.use.splice(index, 0, {
      loader: 'probe',
      options: { ..._options, type: 'end' },
    });
    rule.use.splice(index + 2, 0, {
      loader: 'probe',
      options: { ..._options, type: 'start' },
    });
  }
  return rule;
};
describe('test src/build/utils/loader.ts addProbeLoader2Rules', () => {
  it('addProbeLoader2Rules()', () => {
    expect(
      addProbeLoader2Rules(rules, appendRule, (r: Plugin.BuildRuleSetRule) =>
        Utils.getLoaderNameMatch(r, 'builtin:swc-loader', true),
      ),
    ).toMatchSnapshot();
  });
});
