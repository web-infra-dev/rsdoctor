import { planAnalysis } from './planner';
import type { AnalysisResult, AnalysisTraceItem } from './types';

export async function runAnalysisSession({
  query,
  dataFile,
  executeTool,
}: {
  query: string;
  dataFile: string;
  executeTool: (request: {
    toolName: string;
    input: Record<string, unknown>;
    dataFile: string;
  }) => Promise<unknown>;
}): Promise<AnalysisResult> {
  const plan = planAnalysis(query);
  const trace: AnalysisTraceItem[] = [];

  for (const step of plan) {
    const output = await executeTool({
      toolName: step.toolName,
      input: step.input,
      dataFile,
    });

    trace.push({
      toolName: step.toolName,
      input: step.input,
      output,
    });
  }

  const summary = [
    `Executed ${trace.length} tools for query: ${query}`,
    `Tools: ${trace.map((item) => item.toolName).join(', ')}`,
  ].join('\n');

  return {
    query,
    plan,
    trace,
    summary,
  };
}
