import fs from 'fs';
import path from 'path';
import { Linter, Rule, SDK } from '@rsdoctor/types';
import { defineRule } from '../../rule';
import type { Config } from './types';

export type { Config } from './types';

const title = 'esm-resolved-to-cjs';

interface FullPkgJson {
  name?: string;
  version?: string;
  module?: string;
  exports?: unknown;
}

function normalizePathForCompare(filePath: string): string {
  const queryIndex = filePath.indexOf('?');
  const hashIndex = filePath.indexOf('#');
  const splitIndex = [queryIndex, hashIndex]
    .filter((index) => index >= 0)
    .reduce((min, index) => Math.min(min, index), Number.POSITIVE_INFINITY);
  const cleanPath =
    splitIndex === Number.POSITIVE_INFINITY
      ? filePath
      : filePath.slice(0, splitIndex);
  return path.normalize(cleanPath);
}

/**
 * Extract the ESM entry path from a package.json object.
 * Checks (in priority order):
 *   1. exports["."]["import"]          — official conditional exports
 *   2. exports["."]["import"]["default"] — nested form
 *   3. exports["import"]               — top-level shorthand
 *   4. module                          — legacy bundler convention
 *
 * Returns an absolute path, or null if no ESM entry is declared.
 */
function extractEsmEntry(pkgJson: FullPkgJson, pkgRoot: string): string | null {
  const { exports: exportsField, module: moduleField } = pkgJson;

  if (exportsField !== null && typeof exportsField === 'object') {
    const exports = exportsField as Record<string, unknown>;
    const dotEntry = exports['.'];

    if (dotEntry !== null && typeof dotEntry === 'object') {
      const dot = dotEntry as Record<string, unknown>;
      const importEntry = dot['import'];

      if (typeof importEntry === 'string') {
        return path.resolve(pkgRoot, importEntry);
      }
      if (importEntry !== null && typeof importEntry === 'object') {
        const nested = (importEntry as Record<string, unknown>)['default'];
        if (typeof nested === 'string') {
          return path.resolve(pkgRoot, nested);
        }
      }
    }

    // exports["import"] top-level shorthand (no subpath)
    const topImport = exports['import'];
    if (typeof topImport === 'string') {
      return path.resolve(pkgRoot, topImport);
    }
    if (topImport !== null && typeof topImport === 'object') {
      const nested = (topImport as Record<string, unknown>)['default'];
      if (typeof nested === 'string') {
        return path.resolve(pkgRoot, nested);
      }
    }
  }

  if (typeof moduleField === 'string') {
    return path.resolve(pkgRoot, moduleField);
  }

  return null;
}

export const rule = defineRule<typeof title, Config>(() => {
  return {
    meta: {
      code: 'E1009' as const,
      title,
      category: 'bundle',
      severity: Linter.Severity.Warn,
      defaultConfig: {
        ignore: [],
      },
    },
    check({ moduleGraph, packageGraph, report, ruleConfig }) {
      // Cache full package.json reads to avoid repeated I/O
      const pkgJsonCache = new Map<string, FullPkgJson | null>();
      const realPathCache = new Map<string, string>();

      const readPkgJson = (pkgRoot: string): FullPkgJson | null => {
        if (pkgJsonCache.has(pkgRoot)) return pkgJsonCache.get(pkgRoot)!;
        try {
          const raw = fs.readFileSync(
            path.join(pkgRoot, 'package.json'),
            'utf-8',
          );
          const parsed = JSON.parse(raw) as FullPkgJson;
          pkgJsonCache.set(pkgRoot, parsed);
          return parsed;
        } catch {
          pkgJsonCache.set(pkgRoot, null);
          return null;
        }
      };

      const toRealPath = (filePath: string): string => {
        const normalized = normalizePathForCompare(filePath);
        if (realPathCache.has(normalized))
          return realPathCache.get(normalized)!;
        try {
          const realPath =
            typeof fs.realpathSync.native === 'function'
              ? fs.realpathSync.native(normalized)
              : fs.realpathSync(normalized);
          const normalizedRealPath = path.normalize(realPath);
          realPathCache.set(normalized, normalizedRealPath);
          return normalizedRealPath;
        } catch {
          realPathCache.set(normalized, normalized);
          return normalized;
        }
      };

      type Group = {
        packageName: string;
        packageVersion: string;
        esmEntry: string;
        resolvedModule: Rule.EsmResolvedToCjsRuleStoreData['resolvedModule'];
        issuers: Rule.EsmResolvedToCjsRuleStoreData['issuers'];
      };

      const groups = new Map<string, Group>();
      const inNodeModules = /[/\\]node_modules[/\\]/;

      for (const dep of moduleGraph.getDependencies()) {
        // Only static ESM import from user code into node_modules, not yet native ESM, not ignored
        if (
          dep.kind !== SDK.DependencyKind.ImportStatement ||
          inNodeModules.test(dep.module.path) ||
          !inNodeModules.test(dep.dependency.path) ||
          dep.dependency.meta.strictHarmonyModule ||
          ruleConfig.ignore.some((p) => dep.request.includes(p))
        )
          continue;

        const pkg = packageGraph.getPackageByModule(dep.dependency);
        if (!pkg?.root) continue;

        const pkgJson = readPkgJson(pkg.root);
        const esmEntry =
          !ruleConfig.ignore.some((p) => pkg.name.includes(p)) &&
          pkgJson &&
          extractEsmEntry(pkgJson, pkg.root);
        if (!esmEntry) continue;

        const resolvedModuleRealPath = toRealPath(dep.dependency.path);
        if (resolvedModuleRealPath === toRealPath(esmEntry)) continue;

        const groupKey = `${pkg.name}::${resolvedModuleRealPath}`;
        const issuer = {
          id: dep.module.id,
          path: dep.module.path,
          request: dep.request,
        };

        if (groups.has(groupKey)) {
          groups.get(groupKey)!.issuers.push(issuer);
        } else {
          groups.set(groupKey, {
            packageName: pkg.name,
            packageVersion: pkg.version,
            esmEntry,
            resolvedModule: {
              id: dep.dependency.id,
              path: dep.dependency.path,
              webpackId: dep.dependency.webpackId,
            },
            issuers: [issuer],
          });
        }
      }

      for (const group of groups.values()) {
        const detail: Linter.ReportDetailData<Rule.EsmResolvedToCjsRuleStoreData> =
          {
            type: title,
            packageName: group.packageName,
            packageVersion: group.packageVersion,
            esmEntry: group.esmEntry,
            resolvedModule: group.resolvedModule,
            issuers: group.issuers,
          };

        const message =
          `"${group.packageName}" declares an ESM entry ("${group.esmEntry}") ` +
          `but was resolved to CJS by ${group.issuers.length} ESM import(s). ` +
          `Check your bundler's \`resolve.mainFields\` or \`resolve.conditionNames\` config.`;

        report({ message, detail });
      }
    },
  };
});
