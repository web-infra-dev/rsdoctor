import { Compiler } from "@rspack/core";
import path from "path";

const BuiltinLoaderName = 'builtin:swc-loader';

export class BuiltinLoaderPlugin {
  apply(compiler: Compiler) {
    compiler.hooks.beforeRun.tap(
      {
        name: 'CustomLoaderPlugin',
      }, () => {
        const rules = compiler.options.module.rules;
        rules.forEach((rule) => {
          if (rule && typeof rule === 'object' && Array.isArray(rule.use)) {
            const _builtinLoaderRuleIndex = rule.use.findIndex((use) => typeof use === 'object' && use.loader.includes(BuiltinLoaderName));
            if (_builtinLoaderRuleIndex !== -1) {
              const _builtinLoaderRule = rule.use[_builtinLoaderRuleIndex];
              const options = typeof _builtinLoaderRule === 'string' ? { type: 'start' } : { ..._builtinLoaderRule, type: 'start' };
              rule.use.splice(_builtinLoaderRuleIndex, 0, { loader: path.join(__dirname, './probeLoader.js'), options: { ...options, type: 'end' } });
              rule.use.splice(_builtinLoaderRuleIndex + 2, 0, { loader: path.join(__dirname, './probeLoader.js'), options });
            }
          }
        });

        compiler.options.module.rules = rules;
      });
  }
}