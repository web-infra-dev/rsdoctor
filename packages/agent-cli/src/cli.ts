import { createRsdoctorCliToolExecutor } from './executor';
import { runAnalysisSession } from './core/session';
import { getToolCatalog, runAiCli } from './commands';

function parseArgs(argv: string[]) {
  const args = [...argv];
  const command = args.shift() ?? '';
  const toolName = command === 'run-tool' ? (args.shift() ?? '') : '';
  const queryParts: string[] = command === 'analyze' ? [] : [];
  let dataFile = '';
  let input = '{}';
  let format = 'text';

  while (args.length > 0) {
    const current = args.shift();

    if (!current) {
      continue;
    }

    if (current === '--data-file') {
      dataFile = args.shift() ?? '';
      continue;
    }

    if (current === '--input') {
      input = args.shift() ?? '{}';
      continue;
    }

    if (current === '--format') {
      format = args.shift() ?? 'text';
      continue;
    }

    if (command === 'analyze') {
      queryParts.push(current);
    }
  }

  return {
    command,
    toolName,
    dataFile,
    input,
    query: queryParts.join(' ').trim(),
    format,
  };
}

function printUsage(writeError: (text: string) => void) {
  writeError(
    `${[
      'Usage:',
      '  rsdoctor-agent describe-tools',
      '  rsdoctor-agent run-tool <tool-name> --data-file <path> [--input <json>]',
      '  rsdoctor-agent analyze <query> --data-file <path> [--format json|text]',
      '  rsdoctor-agent <group> <subcommand> --data-file <path> [--compact]',
    ].join('\n')}\n`,
  );
}

export async function runCli(
  argv = process.argv.slice(2),
  options?: {
    executeTool?: (request: {
      toolName: string;
      input: Record<string, unknown>;
      dataFile: string;
    }) => Promise<unknown>;
    write?: (text: string) => void;
    writeError?: (text: string) => void;
  },
) {
  if (argv[0] === 'ai') {
    return runAiCli(argv.slice(1), {
      write: options?.write,
      writeError: options?.writeError,
    });
  }

  const topLevelCommands = new Set(['describe-tools', 'run-tool', 'analyze']);
  if (argv[0] && !topLevelCommands.has(argv[0])) {
    return runAiCli(argv, {
      write: options?.write,
      writeError: options?.writeError,
    });
  }

  const { command, toolName, dataFile, input, query, format } = parseArgs(argv);
  const write =
    options?.write ?? ((text: string) => process.stdout.write(text));
  const writeError =
    options?.writeError ?? ((text: string) => process.stderr.write(text));
  const tools = getToolCatalog();

  if (command === 'describe-tools') {
    write(
      JSON.stringify(
        tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      ),
    );
    return 0;
  }

  const toolExecutorFactory = () =>
    createRsdoctorCliToolExecutor({ tools }).execute;

  if (command === 'analyze' && query && dataFile) {
    const executeTool = options?.executeTool ?? toolExecutorFactory();
    const result = await runAnalysisSession({
      query,
      dataFile,
      executeTool,
    });

    if (format === 'json') {
      write(JSON.stringify(result));
      return 0;
    }

    write(`${result.summary}\n`);
    return 0;
  }

  if (command !== 'run-tool' || !toolName || !dataFile) {
    printUsage(writeError);
    return 1;
  }

  let parsedInput: Record<string, unknown>;
  try {
    parsedInput = JSON.parse(input) as Record<string, unknown>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeError(`Invalid JSON for --input: ${message}\n`);
    return 1;
  }

  const executor = options?.executeTool ?? toolExecutorFactory();

  const result = await executor({
    toolName,
    input: parsedInput,
    dataFile,
  });

  write(JSON.stringify(result));
  return 0;
}

export async function main(argv = process.argv.slice(2)) {
  const exitCode = await runCli(argv);
  process.exitCode = exitCode;
}
