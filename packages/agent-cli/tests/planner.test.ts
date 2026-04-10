import { describe, expect, it } from '@rstest/core';

import { planAnalysis } from '../src/core/planner';

describe('analysis planner', () => {
  it('creates a multi-step plan for broad optimization questions', () => {
    const plan = planAnalysis(
      'Analyze this build and provide optimization suggestions for bundle size and tree shaking.',
    );

    expect(plan.map((step) => step.toolName)).toEqual([
      'build_summary',
      'bundle_optimize',
      'tree_shaking_summary',
    ]);
  });

  it('focuses on package issues when the query is dependency-oriented', () => {
    const plan = planAnalysis(
      'Check duplicate packages and similar dependencies in this build.',
    );

    expect(plan.map((step) => step.toolName)).toEqual([
      'packages_duplicates',
      'packages_similar',
    ]);
  });
});
