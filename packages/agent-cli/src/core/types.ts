// --- Tool types (merged from tools/types.ts) ---

export interface JsonSchema {
  type: 'object';
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ToolCommandContext {
  dataFile: string;
  input: Record<string, unknown>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  buildCommand: (context: ToolCommandContext) => string[];
}

export interface ToolExecutionRequest {
  toolName: string;
  input: Record<string, unknown>;
  dataFile: string;
}

export interface ToolExecutor {
  execute: (request: ToolExecutionRequest) => Promise<unknown>;
}

// --- Analysis types ---

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
