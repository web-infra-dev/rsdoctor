export interface AnalysisStep {
  toolName: string;
  input: Record<string, unknown>;
  rationale: string;
}

export interface AnalysisTraceItem {
  toolName: string;
  input: Record<string, unknown>;
  output: unknown;
}

export interface AnalysisResult {
  query: string;
  plan: AnalysisStep[];
  trace: AnalysisTraceItem[];
  summary: string;
}
