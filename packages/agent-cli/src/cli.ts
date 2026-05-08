import { cac } from 'cac';

import packageJson from '../package.json';
import { createRsdoctorCliToolExecutor } from './executor';
import { describeSubcommands, getToolCatalog, runAiCli } from './commands';

function parseStringOption(value: unknown, fallback: string) {
  return typeof value === 'string' ? value : fallback;
}

function parsePositiveIntegerOption(
  value: unknown,
  optionName: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    throw new Error(`${optionName} must be a positive integer.`);
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${optionName} must be a positive integer.`);
  }
  return parsed;
}

async function runQueryCommand(
  toolName: string,
  options: Record<string, unknown>,
  context: {
    executeTool?: (request: {
      toolName: string;
      input: Record<string, unknown>;
      dataFile: string;
    }) => Promise<unknown>;
    write: (text: string) => void;
    writeError: (text: string) => void;
    tools: ReturnType<typeof getToolCatalog>;
  },
) {
  const dataFile = parseStringOption(options.dataFile, '');
  const input = parseStringOption(options.input, '{}');
  const filter = parseStringOption(options.filter, '');
  let page: number | undefined;
  let pageSize: number | undefined;

  try {
    page = parsePositiveIntegerOption(options.page, '--page');
    pageSize = parsePositiveIntegerOption(options.pageSize, '--page-size');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.writeError(`${message}\n`);
    return 1;
  }

  if (!toolName || !dataFile) {
    context.writeError('Missing required option: --data-file <path>\n');
    return 1;
  }

  let parsedInput: Record<string, unknown>;
  try {
    parsedInput = JSON.parse(input) as Record<string, unknown>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.writeError(`Invalid JSON for --input: ${message}\n`);
    return 1;
  }

  const executor =
    context.executeTool ??
    createRsdoctorCliToolExecutor({ tools: context.tools }).execute;
  const mergedInput: Record<string, unknown> = {
    ...parsedInput,
    ...(filter ? { filter } : {}),
    ...(page !== undefined ? { page } : {}),
    ...(pageSize !== undefined ? { pageSize } : {}),
  };

  const result = await executor({
    toolName,
    input: mergedInput,
    dataFile,
  });

  context.write(JSON.stringify(result));
  return 0;
}

function createRootCli(options: {
  executeTool?: (request: {
    toolName: string;
    input: Record<string, unknown>;
    dataFile: string;
  }) => Promise<unknown>;
  write: (text: string) => void;
  writeError: (text: string) => void;
}) {
  const cli = cac('rsdoctor-agent');
  const tools = getToolCatalog();
  cli.help();

  cli.command('list', 'List all available subcommands.').action(() => {
    options.write(JSON.stringify(describeSubcommands()));
    return 0;
  });

  cli
    .command('query <toolName>', 'Execute one mapped tool from the catalog.')
    .allowUnknownOptions()
    .option('--data-file [path]', 'Rsdoctor data file path.')
    .option('--input [json]', 'Tool input JSON.', { default: '{}' })
    .option('--filter [fields]', 'Comma-separated field paths to keep.')
    .option('--page [n]', 'Page number for paginating output collections.')
    .option('--page-size [n]', 'Page size for paginating output collections.')
    .action((toolName, parsedOptions) =>
      runQueryCommand(toolName, parsedOptions, {
        executeTool: options.executeTool,
        write: options.write,
        writeError: options.writeError,
        tools,
      }),
    );

  return cli;
}

async function runRegisteredCommands(
  argv: string[],
  options: {
    executeTool?: (request: {
      toolName: string;
      input: Record<string, unknown>;
      dataFile: string;
    }) => Promise<unknown>;
    write: (text: string) => void;
    writeError: (text: string) => void;
  },
): Promise<number | undefined> {
  if (
    argv[0] !== '--help' &&
    argv[0] !== '-h' &&
    argv[0] !== '--version' &&
    argv[0] !== '-v' &&
    argv[0] !== 'list' &&
    argv[0] !== 'query'
  ) {
    return undefined;
  }

  try {
    const cli = createRootCli(options);

    if (argv[0] === '--help' || argv[0] === '-h') {
      const commandHelp = cli.commands
        .map((command) => `  ${command.rawName}  ${command.description}`)
        .join('\n');
      options.write(
        `rsdoctor-agent\n\nUsage:\n  $ rsdoctor-agent <command> [options]\n\nCommands:\n${commandHelp}\n`,
      );
      return 0;
    }

    if (argv[0] === '--version' || argv[0] === '-v') {
      options.write(`${packageJson.version}\n`);
      return 0;
    }

    cli.parse(['node', 'rsdoctor-agent', ...argv], { run: false });

    if (!cli.matchedCommand) {
      return 0;
    }
    const result = await cli.runMatchedCommand();
    return typeof result === 'number' ? result : 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    options.writeError(`${message}\n`);
    return 1;
  }
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
  const write =
    options?.write ?? ((text: string) => process.stdout.write(text));
  const writeError =
    options?.writeError ?? ((text: string) => process.stderr.write(text));

  if (!argv[0]) {
    writeError(
      'Usage: rsdoctor-agent <command>\nRun rsdoctor-agent --help for available commands.\n',
    );
    return 1;
  }

  const registeredCommandExitCode = await runRegisteredCommands(argv, {
    executeTool: options?.executeTool,
    write,
    writeError,
  });
  if (registeredCommandExitCode !== undefined) {
    return registeredCommandExitCode;
  }

  // everything else: direct group commands (chunks list, modules by-id, etc.)
  return runAiCli(argv, {
    write: options?.write,
    writeError: options?.writeError,
  });
}

export async function main(argv = process.argv.slice(2)) {
  const exitCode = await runCli(argv);
  process.exitCode = exitCode;
}
