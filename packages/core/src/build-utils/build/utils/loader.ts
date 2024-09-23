import path from 'path';
import fse from 'fs-extra';
import { omit } from 'lodash';
import { Loader } from '@rsdoctor/utils/common';
import type { Common, Plugin } from '@rsdoctor/types';
import { Rule, SourceMapInput as WebpackSourceMapInput } from '../../../types';
import { readPackageJson } from '@rsdoctor/graph';
import { RuleSetUseItem } from '@rspack/core';
import { RuleSetUseItem as WebpackRuleSetUseItem } from 'webpack';
import { debug } from '@rsdoctor/utils/logger';

// webpack https://github.com/webpack/webpack/blob/2953d23a87d89b3bd07cf73336ee34731196c62e/lib/util/identifier.js#L311
// rspack https://github.com/web-infra-dev/rspack/blob/d22f049d4bce4f8ac20c1cbabeab3706eddaecc1/packages/rspack/src/loader-runner/index.ts#L47
const PATH_QUERY_FRAGMENT_REGEXP =
  /^((?:\0.|[^?#\0])*)(\?(?:\0.|[^#\0])*)?(#.*)?$/;

export function parsePathQueryFragment(str: string): {
  path: string;
  query: string;
  fragment: string;
} {
  const match = PATH_QUERY_FRAGMENT_REGEXP.exec(str);
  return {
    path: match?.[1].replace(/\0(.)/g, '$1') || '',
    query: match?.[2] ? match[2].replace(/\0(.)/g, '$1') : '',
    fragment: match?.[3] || '',
  };
}

export function loadLoaderModule(
  loaderPath: string,
  cwd = process.cwd(),
): {
  default: Plugin.LoaderDefinition<Common.PlainObject, {}>;
  pitch: Plugin.PitchLoaderDefinitionFunction;
  raw: boolean | void;
} {
  const cleanLoaderPath = parsePathQueryFragment(loaderPath).path;
  const mod = require(
    process.env.DOCTOR_TEST
      ? path.resolve(cwd, cleanLoaderPath)
      : require.resolve(cleanLoaderPath, {
          paths: [cwd, path.resolve(cwd, 'node_modules')],
        }),
  );

  const isESM = mod.__esModule && typeof mod.default === 'function';

  return {
    default: isESM ? mod.default : typeof mod === 'function' ? mod : null,
    pitch: mod.default?.pitch || mod.pitch,
    raw: mod.default?.raw || mod.raw || false,
  };
}

export function extractLoaderName(loaderPath: string, cwd = ''): string {
  let res = loaderPath.replace(cwd, '');

  if (!path.isAbsolute(res)) return res;

  const nms = '/node_modules/';
  const idx = res.lastIndexOf(nms);

  if (idx !== -1) {
    // babel-loader/lib/index.js
    res = res.slice(idx + nms.length);

    const ln = 'loader';
    const lnIdx = res.lastIndexOf(ln);
    if (lnIdx > -1) {
      // babel-loader
      res = res.slice(0, lnIdx + ln.length);
    }
  }

  return res;
}

export function mapEachRules<T extends Plugin.BuildRuleSetRule>(
  rules: T[],
  callback: (rule: T) => T,
): T[] {
  return rules.filter(Boolean).map((rule) => {
    if (typeof rule === 'string') {
      return callback({
        loader: rule,
      } as unknown as T);
    }

    // https://webpack.js.org/configuration/module/#ruleloader
    if (rule.loader && typeof rule.loader === 'string') {
      return callback(rule);
    }

    // https://webpack.js.org/configuration/module/#ruleloaders
    if (Array.isArray((rule as Rule).loaders)) {
      const { loaders, ...rest } = rule as Rule;
      return {
        ...(rest as Plugin.RuleSetRule),
        use: mapEachRules(loaders as T[], callback),
      } as unknown as T;
    }

    if (rule.use && (!Array.isArray(rule.use) || rule.use.length !== 0)) {
      if (typeof rule.use === 'string') {
        return {
          ...rule,
          use: mapEachRules(
            [
              {
                loader: rule.use,
                options: rule.options,
              } as T,
            ],
            callback,
          ),
        };
      }

      if (typeof rule.use === 'function') {
        const funcUse = rule.use;
        const newRule = {
          ...rule,
          use: (...args: any) => {
            const rules = funcUse.apply(null, args) as T[];
            return mapEachRules(rules, callback);
          },
        };
        return newRule;
      }

      if (Array.isArray(rule.use)) {
        return {
          ...rule,
          use: mapEachRules(rule.use as T[], callback),
        };
      }
      return {
        ...rule,
        use: mapEachRules([rule.use] as T[], callback),
      };
    }

    // nested rule, https://webpack.js.org/configuration/module/#nested-rules
    if ('rules' in rule && Array.isArray(rule.rules)) {
      return {
        ...rule,
        rules: mapEachRules(rule.rules as T[], callback),
      };
    }

    // nested rule
    if (Array.isArray(rule.oneOf)) {
      return {
        ...rule,
        oneOf: mapEachRules(rule.oneOf as T[], callback),
      };
    }

    return rule;
  });
}

export function isESMLoader(r: Plugin.BuildRuleSetRule) {
  let _loaderName =
    typeof r === 'object' && typeof r?.loader === 'string'
      ? r.loader
      : typeof r === 'string'
        ? r
        : '';
  if (!_loaderName) return false;
  const isPath =
    _loaderName.startsWith('/') ||
    _loaderName.startsWith('./') ||
    _loaderName.startsWith('../');
  if (isPath) {
    // Code to handle loaderName as a path address
    const packageJsonData = readPackageJson(_loaderName, (file) => {
      try {
        return fse.readJsonSync(file, { encoding: 'utf8' });
      } catch (e) {
        debug(() => `isESMLoader function error：${e}`);
      }
    });

    if (packageJsonData?.type === 'module') return true;
  }

  // Code to handle loaderName as a loader name
  return false;
}

function appendProbeLoaders(
  compiler: Plugin.BaseCompiler,
  loaderConfig: RuleSetUseItem | WebpackRuleSetUseItem,
): RuleSetUseItem[] {
  const _options =
    typeof loaderConfig === 'object'
      ? typeof loaderConfig.options === 'string'
        ? { options: loaderConfig.options }
        : loaderConfig.options
      : {};
  const loaderPath = path.join(__dirname, '../loader/probeLoader.js');
  const loader =
    typeof loaderConfig === 'string'
      ? loaderConfig
      : typeof loaderConfig === 'object' && loaderConfig.loader;

  const createProbeLoader = (type: 'start' | 'end') => ({
    loader: loaderPath,
    options: {
      ..._options,
      loader,
      ident: undefined,
      type,
      builderName: compiler.options.name,
    },
  });

  return [
    createProbeLoader('end'),
    loaderConfig as RuleSetUseItem,
    createProbeLoader('start'),
  ];
}

export function getLoaderNameMatch(
  r: Plugin.BuildRuleSetRule,
  loaderName: string,
  strict = true,
) {
  if (!strict) {
    return (
      (typeof r === 'object' &&
        typeof r?.loader === 'string' &&
        r.loader.includes(loaderName)) ||
      (typeof r === 'string' && (r as string).includes(loaderName))
    );
  }
  return (
    (typeof r === 'object' &&
      typeof r?.loader === 'string' &&
      r.loader === loaderName) ||
    (typeof r === 'string' && r === loaderName)
  );
}
export function addProbeLoader2Rules<T extends Plugin.BuildRuleSetRule>(
  rules: T[],
  compiler: Plugin.BaseCompiler,
  fn: (r: Plugin.BuildRuleSetRule) => boolean,
): T[] {
  return rules.map((rule) => {
    if (!rule || typeof rule === 'string') return rule;

    // Handle single loader case
    if (fn(rule) && !rule.use) {
      const loaderConfig: RuleSetUseItem = {
        loader: rule.loader ?? '',
        options: rule.options,
        ident:
          'ident' in rule && typeof rule.ident === 'string'
            ? rule.ident
            : undefined,
      };
      return {
        ...rule,
        use: appendProbeLoaders(compiler, loaderConfig),
        loader: undefined,
        options: undefined,
      };
    }

    // Handle 'use' property
    if (rule.use) {
      if (Array.isArray(rule.use)) {
        rule.use = rule.use.flatMap((loaderConfig) => {
          if (
            typeof loaderConfig === 'string' ||
            (typeof loaderConfig === 'object' &&
              loaderConfig &&
              'loader' in loaderConfig)
          ) {
            return fn(loaderConfig as T)
              ? appendProbeLoaders(compiler, loaderConfig)
              : [loaderConfig];
          }
          return [loaderConfig];
        });
      } else if (
        typeof rule.use === 'object' &&
        !Array.isArray(rule.use) &&
        typeof rule.use !== 'function'
      ) {
        if ('loader' in rule.use) {
          rule.use = fn(rule.use as T)
            ? appendProbeLoaders(compiler, rule.use)
            : [rule.use];
        }
      } else if (typeof rule.use === 'string') {
        rule.use = fn(rule.use as unknown as T)
          ? appendProbeLoaders(compiler, { loader: rule.use })
          : [
              {
                loader: rule.use,
              },
            ];
      }
    }

    // Handle nested rules
    if ('oneOf' in rule && rule.oneOf) {
      return {
        ...rule,
        oneOf: addProbeLoader2Rules<T>(rule.oneOf as T[], compiler, fn),
      };
    }

    if ('rules' in rule && rule.rules) {
      return {
        ...rule,
        rules: addProbeLoader2Rules<T>(rule.rules as T[], compiler, fn),
      };
    }

    return rule;
  });
}

export function createLoaderContextTrap(
  this: Plugin.LoaderContext<Common.PlainObject>,
  final: (
    err: Error | null | undefined,
    res: string | Buffer | null,
    sourceMap?: WebpackSourceMapInput,
  ) => void,
) {
  // callback
  const cb = this.callback;
  let callback: typeof this.callback = (...args: any[]) => {
    final(args[0], args[1] ?? null, args[2]);
    return cb.call(this, ...args);
  };
  // async
  const ac = this.async;
  let async: typeof this.async = (...args) => {
    const cb = ac(...args);
    return (...args) => {
      final(args[0], args[1] ?? null, args[2]);
      return cb(...args);
    };
  };

  // proxy loader context for async loader function.
  const trap = new Proxy(this, {
    get(target, key, receiver) {
      switch (key) {
        case 'async':
          return async;
        case 'callback':
          return callback;
        case 'query':
          if (target.query) {
            // avoid loader options validation error.
            // FIXME: useless in theory, in proxy-loader this.query always hits rule.options
            if (typeof target.query === 'string') {
              const res = target.query.replace(
                // eslint-disable-next-line no-useless-escape
                new RegExp(
                  `"${Loader.LoaderInternalPropertyName}":\{[^\}]*\},{0,1}`,
                ),
                '',
              );
              return res;
            }

            if (typeof target.query === 'object') {
              const options = target.query[Loader.LoaderInternalPropertyName];

              // webpack4 https://v4.webpack.js.org/api/loaders/#thisquery
              // webpack5 https://webpack.js.org/api/loaders/#thisquery
              if (options.hasOptions) {
                return omit(target.query, [Loader.LoaderInternalPropertyName]);
              }
              const innerLoaderPath = options?.loader;
              const loaderQuery = parsePathQueryFragment(innerLoaderPath).query;
              return loaderQuery;
            }
          }

          return Reflect.get(target, key, receiver);
        case 'getOptions':
          // avoid loader options validation error.
          return typeof target.getOptions === 'function'
            ? () =>
                omit(target.getOptions(), [Loader.LoaderInternalPropertyName])
            : Reflect.get(target, key, receiver);
        default:
          const _target = target as unknown as Record<string | symbol, unknown>;
          return _target[key];
      }
    },
    set(target, key, value, receiver) {
      switch (key) {
        // avoid to be called in infinite loop when other overwrite Plugin.LoaderContext.callback
        case 'async':
          async = value;
          return true;
        case 'callback':
          callback = value;
          return true;
        default:
          return Reflect.set(target, key, value, receiver);
      }
    },
    defineProperty(target, p, attrs) {
      return Reflect.defineProperty(target, p, attrs);
    },
  });

  return trap;
}

export function parseQuery(query: string) {
  if (query.startsWith('?')) {
    query = query.slice(1);
  }
  const searchParams = new URLSearchParams(query);
  return Object.fromEntries(searchParams.entries());
}
