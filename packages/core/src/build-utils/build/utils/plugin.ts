import type { Common } from '@rsdoctor/types';
import { isWebpack5orRspack } from '@/build-utils/common/module-graph/compatible';
import { Plugin } from '@rsdoctor/types';

export type IHook =
  Plugin.BaseCompiler['hooks'][keyof Plugin.BaseCompiler['hooks']];

export function shouldInterceptPluginHook<T extends IHook>(hook: T) {
  // webpack5 use fakehook for deprecated hook.
  if ((hook as Common.PlainObject)._fakeHook) {
    return false;
  }

  // Hook
  if (typeof hook.isUsed === 'function') {
    return hook.isUsed();
  }

  // HookMap
  if (
    (hook as Common.PlainObject)._map &&
    ((hook as Common.PlainObject)._map as Map<string, unknown>).size === 0
  ) {
    return false;
  }

  return true;
}

export function interceptCompilerHooks(
  compiler: Plugin.BaseCompiler,
  interceptor: (name: string, hook: IHook, scope: 'compiler') => void,
) {
  Object.keys(compiler.hooks).forEach((hook) => {
    const v = compiler.hooks[hook as keyof Plugin.BaseCompiler['hooks']];
    if (shouldInterceptPluginHook(v)) {
      interceptor(hook, v, 'compiler');
    }
  });
}

export function interceptCompilationHooks(
  compilation: Plugin.BaseCompilation,
  interceptor: (name: string, hook: IHook, scope: 'compilation') => void,
) {
  Object.keys(compilation.hooks).forEach((hook) => {
    /**
     * @link: https://webpack.js.org/blog/2020-10-10-webpack-5-release/#minor-changes
     * Compilation.hooks.normalModuleLoader is deprecated
     *   MIGRATION: Use NormalModule.getCompilationHooks(compilation).loader instead
     */
    if (hook === 'normalModuleLoader' && isWebpack5orRspack(compilation)) {
      return;
    }

    const v = compilation.hooks[hook as keyof Plugin.BaseCompilation['hooks']];
    if (shouldInterceptPluginHook(v)) {
      interceptor(hook, v, 'compilation');
    }
  });
}
