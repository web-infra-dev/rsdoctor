import { createRsdoctorCliToolExecutor } from './executor';
import {
  describeRunSubcommands,
  describeSubcommands,
  getToolCatalog,
  runAiCli,
} from './commands';

function parseArgs(argv: string[]) {
  const args = [...argv];
  const command = args.shift() ?? '';
  const toolName = command === 'query' ? (args.shift() ?? '') : '';
  let dataFile = '';
  let input = '{}';
  let filter = '';
  let page: number | undefined;
  let pageSize: number | undefined;

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

    if (current === '--filter') {
      filter = args.shift() ?? '';
      continue;
    }

    if (current === '--page') {
      const value = Number(args.shift() ?? '');
      if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
        throw new Error('--page must be a positive integer.');
      }
      page = value;
      continue;
    }

    if (current === '--page-size') {
      const value = Number(args.shift() ?? '');
      if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
        throw new Error('--page-size must be a positive integer.');
      }
      pageSize = value;
      continue;
    }
  }

  return {
    command,
    toolName,
    dataFile,
    input,
    filter,
    page,
    pageSize,
  };
}

function printUsage(write: (text: string) => void) {
  write(
    `${[
      'Usage:',
      '  rsdoctor-agent list',
      '    List all available subcommands with descriptions and argument schemas.',
      '  rsdoctor-agent query <tool-name> --data-file <path> [--input <json>] [--filter <fields>] [--page <n>] [--page-size <n>]',
      '    Execute one mapped tool from the tool catalog.',
      '  rsdoctor-agent <group> <subcommand> --data-file <path> [--compact]',
      '    Execute one concrete subcommand directly.',
      '  rsdoctor-agent --help',
      '    Show top-level command descriptions.',
    ].join('\n')}\n`,
  );
}

function printListHelp(write: (text: string) => void) {
  write(
    `${[
      'Usage:',
      '  rsdoctor-agent list',
      '',
      'Description:',
      '  Return all subcommands in machine-readable JSON, including path, description, and args schema.',
    ].join('\n')}\n`,
  );
}

function printQueryHelp(write: (text: string) => void) {
  const toolMappings = describeRunSubcommands()
    .sort((a, b) => a.toolName.localeCompare(b.toolName))
    .map((item) => `  ${item.toolName} -> ${item.path}: ${item.description}`);

  write(
    `${[
      'Usage:',
      '  rsdoctor-agent query <tool-name> --data-file <path> [--input <json>] [--filter <fields>] [--page <n>] [--page-size <n>]',
      '',
      'Description:',
      '  Execute one catalog tool and return JSON result.',
      '',
      'Options:',
      '  --input <json>      Tool input JSON.',
      '  --filter <fields>   Comma-separated field paths to keep in output data.',
      '  --page <n>          Page number for paginating output collections.',
      '  --page-size <n>     Page size for paginating output collections.',
      '',
      'Mapped subcommands:',
      ...toolMappings,
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
  const write =
    options?.write ?? ((text: string) => process.stdout.write(text));
  const writeError =
    options?.writeError ?? ((text: string) => process.stderr.write(text));

  if (argv[0] === '--help' || argv[0] === '-h') {
    printUsage(write);
    return 0;
  }

  if (argv[0] === 'list' && (argv.includes('--help') || argv.includes('-h'))) {
    printListHelp(write);
    return 0;
  }

  if (argv[0] === 'query' && (argv.includes('--help') || argv.includes('-h'))) {
    printQueryHelp(write);
    return 0;
  }

  const topLevelCommands = new Set(['list', 'query']);
  if (argv[0] && !topLevelCommands.has(argv[0])) {
    return runAiCli(argv, {
      write: options?.write,
      writeError: options?.writeError,
    });
  }

  let command = '';
  let toolName = '';
  let dataFile = '';
  let input = '{}';
  let filter = '';
  let page: number | undefined;
  let pageSize: number | undefined;

  try {
    ({ command, toolName, dataFile, input, filter, page, pageSize } =
      parseArgs(argv));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeError(`${message}\n`);
    return 1;
  }
  const tools = getToolCatalog();

  if (command === 'list') {
    write(JSON.stringify(describeSubcommands()));
    return 0;
  }

  const toolExecutorFactory = () =>
    createRsdoctorCliToolExecutor({ tools }).execute;

  if (command !== 'query' || !toolName || !dataFile) {
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

  write(JSON.stringify(result));
  return 0;
}

export async function main(argv = process.argv.slice(2)) {
  const exitCode = await runCli(argv);
  process.exitCode = exitCode;
}
