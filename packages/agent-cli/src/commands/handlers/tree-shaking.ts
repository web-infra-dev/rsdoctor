import { getModuleExports, getRules, getSideEffects } from '../datasource';
import { parsePositiveInt } from '../utils';

interface Rule {
  description?: string;
  code?: string;
}

function findRuleByCode(rules: Rule[], code: string): Rule | undefined {
  return rules.find(
    (rule) => rule.code === code || rule.description?.includes(code),
  );
}

export async function detectSideEffectsOnlyImports(): Promise<{
  ok: boolean;
  data: { rule: Rule | null; totalRules: number; note?: string };
  description: string;
}> {
  const rules = getRules() as Rule[];
  const rule = findRuleByCode(rules, 'E1007');
  return {
    ok: true,
    data: {
      rule: rule ?? null,
      totalRules: rules?.length ?? 0,
      note: rule
        ? undefined
        : 'No E1007 side-effects-only import violations found in current analysis.',
    },
    description:
      'Detect modules pulled in solely for side effects (E1007). ' +
      'These indicate tree-shaking failures caused by missing/incorrect "sideEffects" ' +
      'field in package.json or bare `import "module"` patterns. ' +
      "Rspack's sideEffects optimization can eliminate entire modules only when the package " +
      'declares "sideEffects": false (or a glob list) in package.json. ' +
      'Reference: https://www.rspack.dev/guide/optimization/tree-shaking',
  };
}

export async function detectCjsRequire(): Promise<{
  ok: boolean;
  data: { rule: Rule | null; totalRules: number; note?: string };
  description: string;
}> {
  const rules = getRules() as Rule[];
  const rule = findRuleByCode(rules, 'E1008');
  return {
    ok: true,
    data: {
      rule: rule ?? null,
      totalRules: rules?.length ?? 0,
      note: rule
        ? undefined
        : 'No E1008 CJS require violations found in current analysis.',
    },
    description:
      'Detect `require()` calls that prevent tree-shaking (E1008). ' +
      'Bare `require("module")` forces the entire module to be bundled because ' +
      'the bundler cannot statically determine which exports are used. ' +
      'Rspack tree-shaking requires ES module syntax (import/export); ' +
      'CJS require() bypasses usedExports and innerGraph analysis entirely. ' +
      'Fix by using destructured require or ESM imports. ' +
      'Reference: https://www.rspack.dev/guide/optimization/tree-shaking',
  };
}

export async function detectEsmResolvedToCjs(): Promise<{
  ok: boolean;
  data: { rule: Rule | null; totalRules: number; note?: string };
  description: string;
}> {
  const rules = getRules() as Rule[];
  const rule = findRuleByCode(rules, 'E1009');
  return {
    ok: true,
    data: {
      rule: rule ?? null,
      totalRules: rules?.length ?? 0,
      note: rule
        ? undefined
        : 'No E1009 ESM-resolved-to-CJS violations found in current analysis.',
    },
    description:
      'Detect ESM imports resolved to CJS despite the package providing an ESM entry (E1009). ' +
      "This prevents tree-shaking and inflates bundle size because Rspack's usedExports and " +
      'providedExports optimizations only work on ES module graphs. ' +
      'Fix by adding "module" to resolve.mainFields or "import" to resolve.conditionNames in bundler config. ' +
      'Reference: https://www.rspack.dev/guide/optimization/tree-shaking',
  };
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
    sideEffects: unknown;
    totalRules: number;
  };
  description: string;
}> {
  const rules = getRules() as Rule[];
  const sideEffects = getSideEffects();
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
      sideEffects,
      totalRules: rules?.length ?? 0,
    },
    description:
      'Comprehensive tree-shaking health summary. ' +
      'Aggregates all three rule violations (E1007 side-effects-only imports, ' +
      'E1008 bare require() calls, E1009 ESM-resolved-to-CJS) together with ' +
      'per-module bailout reasons from the build graph. ' +
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
): Promise<{ ok: boolean; data: unknown; description: string }> {
  const pageNumber =
    parsePositiveInt(pageNumberInput, 'pageNumber', { min: 1 }) ?? 1;
  const pageSize =
    parsePositiveInt(pageSizeInput, 'pageSize', { min: 1, max: 1000 }) ?? 100;
  const sideEffects = getSideEffects(pageNumber, pageSize);
  return {
    ok: true,
    data: sideEffects,
    description:
      'List modules that cannot be tree-shaken, grouped by bailout reason. ' +
      'bailoutReason explains exactly why the bundler kept a module: ' +
      '"side effects" means package.json declares the package has side effects or the field is missing; ' +
      '"dynamic import" means the module is loaded via import() and its exports are unknown at build time; ' +
      '"unknown exports" means the module uses non-static export patterns (e.g. module.exports = ...) ' +
      'that the bundler cannot analyze statically. ' +
      'In Rspack, the innerGraph and providedExports optimizations are disabled for such modules, ' +
      'preventing dead-code elimination even in production mode. ' +
      'Results are split into node_modules packages and user code with per-package statistics. ' +
      'Reference: https://www.rspack.dev/guide/optimization/tree-shaking',
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
