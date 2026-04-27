import {
  getBailoutReasonModules,
  getModuleExports,
  getRetainedModules,
  getRules,
  retainedModuleCategories,
} from '../datasource';
import type { RetainedModuleCategory } from '../datasource';
import { parseCommaList, parseModulesInput, parsePositiveInt } from '../utils';

interface Rule {
  description?: string;
  code?: string;
}

function parseRetainedCategories(
  value: string | true | undefined,
): RetainedModuleCategory[] {
  return parseCommaList(value).map((category) => {
    if (
      !retainedModuleCategories.includes(category as RetainedModuleCategory)
    ) {
      throw new Error(
        `Invalid category: ${category}. Expected one of: ${retainedModuleCategories.join(
          ', ',
        )}.`,
      );
    }
    return category as RetainedModuleCategory;
  });
}

function parseSortInput(
  value: string | true | undefined,
): 'sourceSize' | 'parsedSize' | 'gzipSize' | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === true) {
    throw new Error('Missing sort.');
  }
  if (
    value !== 'sourceSize' &&
    value !== 'parsedSize' &&
    value !== 'gzipSize'
  ) {
    throw new Error(
      'Invalid sort. Expected one of: sourceSize, parsedSize, gzipSize.',
    );
  }
  return value;
}

function findRuleByCode(rules: Rule[], code: string): Rule | undefined {
  return rules.find(
    (rule) => rule.code === code || rule.description?.includes(code),
  );
}

export async function getTreeShakingSummary(): Promise<{
  ok: boolean;
  data: {
    violations: {
      e1007SideEffectsOnlyImports: Rule | null;
      e1008CjsRequire: Rule | null;
      e1009EsmToCjs: Rule | null;
    };
    totalViolations: number;
    totalRules: number;
  };
  description: string;
}> {
  const rules = getRules() as Rule[];
  const e1007 = findRuleByCode(rules, 'E1007') ?? null;
  const e1008 = findRuleByCode(rules, 'E1008') ?? null;
  const e1009 = findRuleByCode(rules, 'E1009') ?? null;
  const totalViolations = [e1007, e1008, e1009].filter(Boolean).length;
  return {
    ok: true,
    data: {
      violations: {
        e1007SideEffectsOnlyImports: e1007,
        e1008CjsRequire: e1008,
        e1009EsmToCjs: e1009,
      },
      totalViolations,
      totalRules: rules?.length ?? 0,
    },
    description:
      'Comprehensive tree-shaking health summary. ' +
      'Aggregates all three rule violations (E1007 side-effects-only imports, ' +
      'E1008 bare require() calls, E1009 ESM-resolved-to-CJS). ' +
      'For detailed per-module bailout reasons, use the dedicated tree-shaking side-effects command. ' +
      'Rspack enables tree-shaking in production mode via usedExports, sideEffects, ' +
      'providedExports, and innerGraph — violations in this report indicate where those ' +
      'optimizations are being blocked. ' +
      'Use this as the starting point when diagnosing unexpected bundle size growth. ' +
      'Reference: https://www.rspack.dev/guide/optimization/tree-shaking',
  };
}

export async function getBailoutModules(
  pageNumberInput?: string,
  pageSizeInput?: string,
  modulesInput?: string | true | string[] | number[],
): Promise<{ ok: boolean; data: unknown; description: string }> {
  const pageNumber =
    parsePositiveInt(pageNumberInput, 'pageNumber', { min: 1 }) ?? 1;
  const pageSize =
    parsePositiveInt(pageSizeInput, 'pageSize', { min: 1, max: 1000 }) ?? 100;
  const modules = getBailoutReasonModules(
    pageNumber,
    pageSize,
    parseModulesInput(modulesInput),
  );
  return {
    ok: true,
    data: modules,
    description:
      'List paginated modules that cannot be tree-shaken. bailoutReason explains why each module was retained, such as side effects, dynamic import, or unknown exports.',
  };
}

export async function getRetainedModulesHandler(
  emittedOnlyInput?: string | true,
  categoryInput?: string | true,
  sortInput?: string | true,
  limitInput?: string,
  filterInput?: string | true,
): Promise<{ ok: boolean; data: unknown; description: string }> {
  const limit =
    parsePositiveInt(limitInput, 'limit', { min: 1, max: 1000 }) ?? 100;
  const retainedModules = getRetainedModules({
    emittedOnly: emittedOnlyInput === true || emittedOnlyInput === 'true',
    categories: parseRetainedCategories(categoryInput),
    sort: parseSortInput(sortInput),
    limit,
    filterFields: parseCommaList(filterInput),
  });
  return {
    ok: true,
    data: retainedModules,
    description:
      'List retained modules that were not tree-shaken, with normalized categories, package metadata, emitted chunks, and recommendations.',
  };
}

export async function getExportsAnalysis(): Promise<{
  ok: boolean;
  data: unknown;
  description: string;
}> {
  const exports = getModuleExports();
  return {
    ok: true,
    data: exports,
    description:
      'Analyze module exports to identify tree-shaking opportunities. ' +
      'Shows which exports exist across all modules so you can cross-reference ' +
      'with actual import usage. Exports that are never imported are candidates ' +
      'for removal. Re-exported barrel files (index.ts that re-exports everything) ' +
      'are a common cause of poor tree-shaking because the bundler must retain all ' +
      'transitive exports unless every consumer uses named imports exclusively. ' +
      "Rspack's providedExports and re-export analysis can redirect imports through " +
      're-export chains directly to source modules — but only when all exports use ' +
      'static ESM syntax. Mark side-effect-free calls with /*#__PURE__*/ to help ' +
      'the minimizer remove them safely. ' +
      'Reference: https://www.rspack.dev/guide/optimization/tree-shaking',
  };
}
