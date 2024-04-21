import type { Compiler } from '@rspack/core';
import { Utils } from '@rsdoctor/core/build-utils';
import path from 'path';
import { Plugin } from '@rsdoctor/types';
import type { RuleSetRules } from '@rspack/core';

const BuiltinLoaderName = 'builtin:swc-loader';

export class BuiltinLoaderPlugin {
  apply(compiler: Compiler) {
    compiler.hooks.beforeRun.tap(
      {
        name: 'BuiltinLoaderPlugin',
      },
      () => {
        this.addProbeLoader(compiler);
      },
    );

    compiler.hooks.watchRun.tap(
      {
        name: 'BuiltinLoaderPlugin',
      },
      () => {
        this.addProbeLoader(compiler);
      },
    );
  }

  private addProbeLoader(compiler: Compiler) {
    const rules = compiler.options.module.rules as Plugin.RuleSetRule[];
    const appendRule = (rule: Plugin.RuleSetRule, index: number) => {
      if ('use' in rule && Array.isArray(rule.use)) {
        const _builtinRule = rule.use[index] as Plugin.RuleSetRule;
        const _options =
          typeof _builtinRule.options === 'string' ? {} : { ..._builtinRule };

        rule.use.splice(index, 0, {
          loader: path.join(__dirname, './probeLoader.js'),
          options: {
            ..._options,
            type: 'end',
            builderName: compiler.options.name,
          },
        });

        rule.use.splice(index + 2, 0, {
          loader: path.join(__dirname, './probeLoader.js'),
          options: {
            ..._options,
            type: 'start',
            builderName: compiler.options.name,
          },
        });
      }
      return rule;
    };

    compiler.options.module.rules = Utils.changeBuiltinLoader(
      rules,
      BuiltinLoaderName,
      appendRule,
    ) as RuleSetRules;
  }
}
