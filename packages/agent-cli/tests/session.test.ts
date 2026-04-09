import { describe, expect, it } from '@rstest/core';

import { runAnalysisSession } from '../src/core/session';

describe('analysis session', () => {
  it('executes planned tools and collects a final report', async () => {
    const toolCalls: string[] = [];

    const result = await runAnalysisSession({
      query: 'Analyze this build and provide optimization suggestions.',
      dataFile: '/tmp/demo.json',
      executeTool: async ({ toolName }) => {
        toolCalls.push(toolName);
        if (toolName === 'build_summary') {
          return { ok: true, data: { totalBuildTime: 12000 } };
        }
        if (toolName === 'packages_duplicates') {
          return {
            ok: true,
            data: { duplicatedPackages: ['lodash', 'lodash-es'] },
          };
        }
        return { ok: true, data: { inspected: toolName } };
      },
    });

    expect(toolCalls.length).toBeGreaterThan(1);
    expect(result.trace.map((item) => item.toolName)).toEqual(toolCalls);
    expect(result.summary).toContain('build_summary');
    expect(result.summary).toContain('packages_duplicates');
  });
});
