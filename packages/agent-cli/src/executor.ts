import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type {
  ToolDefinition,
  ToolExecutionRequest,
  ToolExecutor,
} from './core/types';
import { getInProcessToolExecutors } from './commands';

const execFileAsync = promisify(execFile);

async function defaultRunCommand(command: string[]): Promise<string> {
  const [file, ...args] = command;
  const { stdout } = await execFileAsync(file, args, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout;
}

function getToolByName(
  tools: ToolDefinition[],
  toolName: string,
): ToolDefinition {
  const tool = tools.find((item) => item.name === toolName);
  if (!tool) {
    throw new Error(`Unknown rsdoctor tool: ${toolName}`);
  }
  return tool;
}

export function createRsdoctorCliToolExecutor({
  tools,
  runCommand = defaultRunCommand,
}: {
  tools: ToolDefinition[];
  runCommand?: (command: string[]) => Promise<string>;
}): ToolExecutor {
  return {
    async execute(request: ToolExecutionRequest): Promise<unknown> {
      const tool = getToolByName(tools, request.toolName);
      const command = tool.buildCommand({
        dataFile: request.dataFile,
        input: request.input,
      });
      const stdout = await runCommand(command);

      try {
        return JSON.parse(stdout);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to parse JSON output from ${request.toolName}: ${message}`,
        );
      }
    },
  };
}

export function createInProcessRsdoctorCliToolExecutor(): ToolExecutor {
  const toolExecutors = getInProcessToolExecutors();

  return {
    async execute(request: ToolExecutionRequest): Promise<unknown> {
      const tool = toolExecutors[request.toolName];
      if (!tool) {
        throw new Error(`Unknown rsdoctor tool: ${request.toolName}`);
      }
      return tool.execute({
        dataFile: request.dataFile,
        input: request.input,
      });
    },
  };
}
