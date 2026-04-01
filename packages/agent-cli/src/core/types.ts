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
