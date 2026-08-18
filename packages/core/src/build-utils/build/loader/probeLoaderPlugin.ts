import type { Plugin } from '@rsdoctor/shared/types';
import type { RuleSetRules } from '@rspack/core';
import { Loader } from '@rsdoctor/shared/common-browser';
import { Build } from '@/build-utils';
import { Utils } from '..';

const BuiltinLoaderName = 'builtin:swc-loader';
const BuiltinLightingCssName = 'builtin:lightningcss-loader';
const ESMLoaderFile = '.mjs';

export class ProbeLoaderPlugin {
  private readonly instrumentedCompilers = new WeakSet<Plugin.BaseCompiler>();

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
    if (this.instrumentedCompilers.has(compiler)) return;

    let rules = compiler.options.module.rules as Plugin.RuleSetRule[];

    if (Loader.isVue(compiler)) {
      compiler.options.module.rules = Utils.addProbeLoader2Rules(
        rules,
        compiler,
        (r: Plugin.BuildRuleSetRule) => !!r.loader || typeof r === 'string',
      ) as RuleSetRules;
      this.instrumentedCompilers.add(compiler);
      return;
    }

    rules = Utils.addProbeLoader2Rules(
      rules,
      compiler,
      (r: Plugin.BuildRuleSetRule) =>
        Build.Utils.getLoaderNameMatch(r, BuiltinLoaderName, true),
    ) as Plugin.RuleSetRule[];

    rules = Utils.addProbeLoader2Rules(
      rules,
      compiler,
      (r: Plugin.BuildRuleSetRule) =>
        Build.Utils.getLoaderNameMatch(r, BuiltinLightingCssName, true),
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
    this.instrumentedCompilers.add(compiler);
  }
}
