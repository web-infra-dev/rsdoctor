import { Linter, Rule } from '@rsdoctor/types';
import { defineRule } from '../../rule';
import type { Config } from './types';

export type { Config } from './types';

const title = 'tree-shaking-side-effects-only';

function isSideEffectDependencyType(dependencyType: string): boolean {
  return dependencyType.toLowerCase() === 'esm import';
}

function isImportSpecifierDependencyType(dependencyType: string): boolean {
  return dependencyType.toLowerCase() === 'esm import specifier';
}

function isStyleFile(modulePath: string): boolean {
  const normalizedPath = modulePath.split('?')[0].split('#')[0].toLowerCase();
  return /\.(css|less|sass|scss|styl|stylus|pcss|postcss)$/.test(
    normalizedPath,
  );
}

function shouldCheckModule(modulePath: string, include: string[]): boolean {
  const isNodeModulesModule = modulePath.includes('/node_modules/');

  if (!isNodeModulesModule) {
    return true;
  }

  return include.some((pattern) => modulePath.includes(pattern));
}

function getSideEffectsImportConnections<
  T extends {
    dependencyType: string;
    originModule?: number;
  },
>(connections: T[], fallbackOriginModule: number): T[] {
  const byOrigin = new Map<number, T[]>();

  for (const connection of connections) {
    const originModule = connection.originModule ?? fallbackOriginModule;
    const existing = byOrigin.get(originModule);

    if (existing) {
      existing.push(connection);
    } else {
      byOrigin.set(originModule, [connection]);
    }
  }

  const result: T[] = [];

  for (const group of byOrigin.values()) {
    const hasEsmImport = group.some((connection) =>
      isSideEffectDependencyType(connection.dependencyType),
    );
    const hasEsmImportSpecifier = group.some((connection) =>
      isImportSpecifierDependencyType(connection.dependencyType),
    );

    // HarmonyImportSideEffectDependency-like condition:
    // keep only origin->resolved pairs that have esm import and no esm import specifier.
    if (hasEsmImport && !hasEsmImportSpecifier) {
      result.push(
        ...group.filter((connection) =>
          isSideEffectDependencyType(connection.dependencyType),
        ),
      );
    }
  }

  return result;
}

export const rule = defineRule<typeof title, Config>(() => {
  return {
    meta: {
      code: 'E1007' as const,
      title,
      category: 'bundle',
      severity: Linter.Severity.Warn,
      defaultConfig: {
        ignore: [],
        include: [],
      },
    },
    check({ moduleGraph, report, ruleConfig }) {
      const precomputed = moduleGraph.getConnectionsOnlyImports();

      for (const item of precomputed) {
        if (isStyleFile(item.modulePath)) {
          continue;
        }

        if (
          ruleConfig.ignore.some((pattern) => item.modulePath.includes(pattern))
        ) {
          continue;
        }
        if (!shouldCheckModule(item.modulePath, ruleConfig.include)) {
          continue;
        }

        const module = moduleGraph.getModuleById(item.moduleUkey);
        if (!module) continue;

        const sideEffectConnections = getSideEffectsImportConnections(
          item.connections,
          item.moduleUkey,
        );
        if (!sideEffectConnections.length) {
          continue;
        }

        const detail: Linter.ReportDetailData<Rule.ConnectionsOnlyImportsRuleStoreData> =
          {
            type: title,
            module: {
              id: module.id,
              path: module.path,
              webpackId: module.webpackId,
            },
            connections: sideEffectConnections.map((c) => ({
              originModule: c.originModule ?? module.id,
              dependencyType: c.dependencyType,
              userRequest: c.userRequest,
            })),
          };

        const importerCount = new Set(
          sideEffectConnections.map((c) => c.originModule ?? module.id),
        ).size;
        const message = `Module "${item.modulePath}" is only imported for its side effects by ${importerCount} importer(s). This may indicate an unintended tree-shaking failure causing redundant bundle output.`;

        report({ message, detail });
      }
    },
  };
});
