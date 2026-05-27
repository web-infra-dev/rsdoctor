import type { Common } from '@rsdoctor/types';
import { Plugin } from '@rsdoctor/types';

export type IHook =
  Plugin.BaseCompiler['hooks'][keyof Plugin.BaseCompiler['hooks']];

export function shouldInterceptPluginHook<T extends IHook>(hook: T) {
  // Rspack can expose fake hooks for deprecated compatibility hooks.
  if (hook && (hook as Common.PlainObject)._fakeHook) {
    return false;
  }

  // Hook
  if (hook?.isUsed && typeof hook.isUsed === 'function') {
    return hook.isUsed();
  }

  // HookMap
  if (
    (hook as Common.PlainObject)?._map &&
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
    if (hook === 'normalModuleLoader') {
      return;
    }

    const v = compilation.hooks[hook as keyof Plugin.BaseCompilation['hooks']];
    if (shouldInterceptPluginHook(v)) {
      interceptor(hook, v, 'compilation');
    }
  });
}
