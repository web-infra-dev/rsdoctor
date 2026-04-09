import type { AnalysisStep } from './types';

function hasAny(text: string, patterns: string[]) {
  return patterns.some((pattern) => text.includes(pattern));
}

function dedupe(steps: AnalysisStep[]) {
  const seen = new Set<string>();
  return steps.filter((step) => {
    if (seen.has(step.toolName)) {
      return false;
    }
    seen.add(step.toolName);
    return true;
  });
}

export function planAnalysis(query: string): AnalysisStep[] {
  const normalized = query.toLowerCase();
  const steps: AnalysisStep[] = [];
  const dependencyFocused = hasAny(normalized, [
    'duplicate package',
    'duplicate packages',
    'similar package',
    'similar packages',
    'dependency',
    'dependencies',
  ]);
  const treeShakingFocused = hasAny(normalized, [
    'tree shaking',
    'tree-shaking',
    'side effects',
  ]);
  const chunkFocused = hasAny(normalized, [
    'chunk',
    'bundle size',
    'split',
    'artifacts',
  ]);

  if (dependencyFocused) {
    steps.push({
      toolName: 'packages_duplicates',
      input: {},
      rationale: 'Check duplicate packages first.',
    });
    steps.push({
      toolName: 'packages_similar',
      input: {},
      rationale: 'Look for overlapping package families.',
    });
  }

  if (treeShakingFocused) {
    steps.push({
      toolName: 'tree_shaking_summary',
      input: {},
      rationale: 'Inspect tree-shaking health and bailout signals.',
    });
  }

  if (chunkFocused) {
    steps.push({
      toolName: 'chunks_list',
      input: {},
      rationale: 'Review chunk composition for size hotspots.',
    });
  }

  if (hasAny(normalized, ['error', 'warning', 'warn'])) {
    steps.push({
      toolName: 'errors_list',
      input: {},
      rationale: 'Review build errors and warnings.',
    });
  }

  const broadOptimization =
    hasAny(normalized, ['optimiz', 'analy', 'build']) && !dependencyFocused;

  if (steps.length === 0 || broadOptimization) {
    const broadSteps: AnalysisStep[] = [
      {
        toolName: 'build_summary',
        input: {},
        rationale: 'Start with an overall build summary.',
      },
      {
        toolName: 'bundle_optimize',
        input: {},
        rationale: 'Collect broad optimization signals.',
      },
      {
        toolName: 'packages_duplicates',
        input: {},
        rationale: 'Check for duplicate package overhead.',
      },
      {
        toolName: 'tree_shaking_summary',
        input: {},
        rationale: 'Inspect tree-shaking health.',
      },
      {
        toolName: 'chunks_list',
        input: {},
        rationale: 'Inspect chunk composition after the broad summary.',
      },
    ];
    steps.unshift(...broadSteps);
  }

  return dedupe(steps);
}
