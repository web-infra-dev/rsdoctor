import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type {
  ToolDefinition,
  ToolExecutionRequest,
  ToolExecutor,
} from './core/types';
import {
  applyToolResultControls,
  splitToolInputControls,
} from './core/result-controls';
import { getInProcessToolExecutors } from './commands';
import { loadJsonData } from './commands/datasource';

const execFileAsync = promisify(execFile);

const TOOL_REQUIRED_SECTIONS: Record<string, string[]> = {
  packages_direct_dependencies: ['packageGraph'],
  packages_duplicates: ['errors'],
  packages_similar: ['packageGraph'],
  tree_shaking_retained_modules: ['moduleGraph'],
  tree_shaking_side_effects: ['moduleGraph'],
  tree_shaking_summary: ['errors'],
};

function getUnavailableSectionResult(
  toolName: string,
  dataFile: string,
): unknown {
  const sections = loadJsonData(dataFile).metadata?.sections;
  for (const section of TOOL_REQUIRED_SECTIONS[toolName] ?? []) {
    const state = sections?.[section];
    if (state?.status === 'omitted') {
      return {
        ok: false,
        error: {
          code: 'RSDOCTOR_SECTION_UNAVAILABLE',
          message: `Rsdoctor artifact section "${section}" is unavailable (${state.reason}).`,
          section,
          status: state.status,
          reason: state.reason,
        },
      };
    }
  }
}

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
      const { controls, passthroughInput, paginateResult } =
        splitToolInputControls(request.input, {
          sourcePagination: tool.sourcePagination,
        });
      const command = tool.buildCommand({
        dataFile: request.dataFile,
        input: passthroughInput,
      });
      const stdout = await runCommand(command);

      try {
        const parsed = JSON.parse(stdout);
        return applyToolResultControls(parsed, controls, {
          paginateResult,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to parse JSON output from ${request.toolName}: ${message}`,
          { cause: error },
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
      const { controls, passthroughInput, paginateResult } =
        splitToolInputControls(request.input, {
          sourcePagination: tool.sourcePagination,
        });
      const unavailableSectionResult = getUnavailableSectionResult(
        request.toolName,
        request.dataFile,
      );
      if (unavailableSectionResult) {
        return unavailableSectionResult;
      }
      const result = await tool.execute({
        dataFile: request.dataFile,
        input: passthroughInput,
      });
      return applyToolResultControls(result, controls, { paginateResult });
    },
  };
}
