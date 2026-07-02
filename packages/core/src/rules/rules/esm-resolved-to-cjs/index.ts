import fs from 'fs';
import path from 'path';
import { Linter, Rule, SDK } from '@rsdoctor/shared/types';
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

function isDefinitelyEsmFile(filePath: string): boolean {
  return path.extname(normalizePathForCompare(filePath)) === '.mjs';
}

function isDeclaredEsmEntry(
  filePath: string,
  esmEntries: string[],
  toRealPath: (filePath: string) => string,
): boolean {
  const realPath = toRealPath(filePath);
  return esmEntries.some((esmEntry) => realPath === toRealPath(esmEntry));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function substituteExportPattern(target: string, wildcard: string): string {
  return target.replace(/\*/g, wildcard);
}

function toPackagePath(
  pkgRoot: string,
  target: string,
  wildcard: string,
): string {
  return path.resolve(pkgRoot, substituteExportPattern(target, wildcard));
}

function collectStringTargets(value: unknown, wildcard: string): string[] {
  if (typeof value === 'string') {
    return [substituteExportPattern(value, wildcard)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectStringTargets(item, wildcard));
  }

  if (!isRecord(value)) return [];

  return Object.values(value).flatMap((child) =>
    collectStringTargets(child, wildcard),
  );
}

function collectEsmTargets(
  exportEntry: unknown,
  pkgRoot: string,
  wildcard: string,
): Set<string> {
  const entries = new Set<string>();

  const addTargets = (value: unknown): void => {
    for (const target of collectStringTargets(value, wildcard)) {
      entries.add(toPackagePath(pkgRoot, target, ''));
    }
  };

  const visit = (value: unknown): void => {
    if (typeof value === 'string' || Array.isArray(value)) {
      addTargets(value);
      return;
    }

    if (!isRecord(value)) return;

    addTargets(value['import']);
    addTargets(value['module']);

    for (const child of Object.values(value)) {
      if (isRecord(child) || Array.isArray(child)) {
        visit(child);
      }
    }
  };

  visit(exportEntry);
  return entries;
}

function hasSubpathExportKeys(exports: Record<string, unknown>): boolean {
  return Object.keys(exports).some(
    (key) => key === '.' || key.startsWith('./'),
  );
}

function matchPatternExportKey(
  patternKey: string,
  exportKey: string,
): string | null {
  const wildcardIndex = patternKey.indexOf('*');
  if (wildcardIndex < 0) return null;

  const prefix = patternKey.slice(0, wildcardIndex);
  const suffix = patternKey.slice(wildcardIndex + 1);
  if (!exportKey.startsWith(prefix) || !exportKey.endsWith(suffix)) {
    return null;
  }

  return exportKey.slice(prefix.length, exportKey.length - suffix.length);
}

function resolveExportEntry(
  exports: Record<string, unknown>,
  exportKey: string,
): { value: unknown; wildcard: string } | null {
  if (Object.prototype.hasOwnProperty.call(exports, exportKey)) {
    return { value: exports[exportKey], wildcard: '' };
  }

  for (const [key, value] of Object.entries(exports)) {
    const wildcard = matchPatternExportKey(key, exportKey);
    if (wildcard !== null) return { value, wildcard };
  }

  return null;
}

function resolveExportEntryForKey(
  exportsField: unknown,
  exportKey: string,
): { value: unknown; wildcard: string } | null {
  if (!isRecord(exportsField)) return null;
  if (!hasSubpathExportKeys(exportsField)) {
    return exportKey === '.' ? { value: exportsField, wildcard: '' } : null;
  }

  return resolveExportEntry(exportsField, exportKey);
}

/**
 * Extract ESM entry paths from a package.json object.
 * Resolves the export entry for the current request first, so another subpath
 * cannot suppress a real ESM-to-CJS mismatch.
 */
function extractEsmEntries(
  pkgJson: FullPkgJson,
  pkgRoot: string,
  exportKey: string,
): Set<string> {
  const { exports: exportsField, module: moduleField } = pkgJson;
  const resolvedExport = resolveExportEntryForKey(exportsField, exportKey);
  const entries = resolvedExport
    ? collectEsmTargets(resolvedExport.value, pkgRoot, resolvedExport.wildcard)
    : new Set<string>();

  if (exportKey === '.' && typeof moduleField === 'string') {
    entries.add(path.resolve(pkgRoot, moduleField));
  }

  return entries;
}

function getExportKeyFromRequest(
  packageName: string,
  request: string,
): string | null {
  if (request === packageName) return '.';
  if (request.startsWith(`${packageName}/`)) {
    return `.${request.slice(packageName.length)}`;
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
        if (ruleConfig.ignore.some((p) => pkg.name.includes(p)) || !pkgJson)
          continue;

        const exportKey = getExportKeyFromRequest(pkg.name, dep.request);
        if (!exportKey) continue;

        const esmEntries = extractEsmEntries(pkgJson, pkg.root, exportKey);
        if (esmEntries.size === 0) continue;
        const esmEntryList = Array.from(esmEntries);

        const resolvedModuleRealPath = toRealPath(dep.dependency.path);
        if (isDefinitelyEsmFile(resolvedModuleRealPath)) continue;

        if (
          isDeclaredEsmEntry(resolvedModuleRealPath, esmEntryList, toRealPath)
        )
          continue;

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
            esmEntry: esmEntryList[0]!,
            resolvedModule: {
              id: dep.dependency.id,
              path: dep.dependency.path,
              identifier: dep.dependency.identifier,
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
