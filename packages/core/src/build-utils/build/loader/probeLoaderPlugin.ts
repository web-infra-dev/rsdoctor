import { Plugin } from '@rsdoctor/types';
import type { RuleSetRules } from '@rspack/core';
import { Loader } from '@rsdoctor/utils/common';
import { Build } from '@/build-utils';
import { Utils } from '..';

const BuiltinLoaderName = 'builtin:swc-loader';
const ESMLoaderFile = '.mjs';

export class ProbeLoaderPlugin {
  apply(compiler: Plugin.BaseCompiler) {
    compiler.hooks.beforeRun.tap(
      {
        name: 'ProbeLoaderPlugin',
      },
      () => {
        this.addProbeLoader(compiler);
      },
    );

    compiler.hooks.watchRun.tap(
      {
        name: 'ProbeLoaderPlugin',
      },
      () => {
        this.addProbeLoader(compiler);
      },
    );
  }

  private addProbeLoader(compiler: Plugin.BaseCompiler) {
    let rules = compiler.options.module.rules as Plugin.RuleSetRule[];

    if (Loader.isVue(compiler)) {
      compiler.options.module.rules = Utils.addProbeLoader2Rules(
        rules,
        compiler,
        (r: Plugin.BuildRuleSetRule) => !!r.loader || typeof r === 'string',
      ) as RuleSetRules;
      return;
    }

    rules = Utils.addProbeLoader2Rules(
      rules,
      compiler,
      (r: Plugin.BuildRuleSetRule) =>
        Build.Utils.getLoaderNameMatch(r, BuiltinLoaderName, true),
    ) as Plugin.RuleSetRule[];

    compiler.options.module.rules = Utils.addProbeLoader2Rules(
      rules,
      compiler,
      (r: Plugin.BuildRuleSetRule) => {
        return (
          Build.Utils.getLoaderNameMatch(r, ESMLoaderFile, false) ||
          Build.Utils.isESMLoader(r)
        );
      },
    ) as RuleSetRules;
  }
}
