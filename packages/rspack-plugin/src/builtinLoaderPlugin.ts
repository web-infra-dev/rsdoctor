import { Compiler } from '@rspack/core';
import { Utils } from '@rsdoctor/core/build-utils';
import path from 'path';
import { Plugin } from '@rsdoctor/types';
import { RuleSetRules } from '@rspack/core';

const BuiltinLoaderName = 'builtin:swc-loader';

export class BuiltinLoaderPlugin {
  apply(compiler: Compiler) {
    compiler.hooks.beforeRun.tap(
      {
        name: 'BuiltinLoaderPlugin',
      },
      () => {
        const rules = compiler.options.module.rules as Plugin.RuleSetRule[];
        const appendRule = (rule: Plugin.RuleSetRule, index: number) => {
          if ('use' in rule && Array.isArray(rule.use)) {
            const _builtinRule = rule.use[index] as Plugin.RuleSetRule;
            const _options =
              typeof _builtinRule.options === 'string'
                ? {}
                : { ..._builtinRule };
            rule.use.splice(index, 0, {
              loader: path.join(__dirname, './probeLoader.js'),
              options: { ..._options, type: 'end' },
            });
            rule.use.splice(index + 2, 0, {
              loader: path.join(__dirname, './probeLoader.js'),
              options: { ..._options, type: 'start' },
            });
          }
          return rule;
        };

        compiler.options.module.rules =
          Utils.changeBuiltinLoader<Plugin.RuleSetRule>(
            rules,
            BuiltinLoaderName,
            appendRule,
          ) as RuleSetRules;
      },
    );
  }
}
