import { cac } from 'cac';

import { route } from './router';

function parseAiArgs(argv: string[]) {
  const cli = cac('rsdoctor-agent');
  const parsed = cli
    .option('--data-file <path>', 'Rsdoctor data file path.')
    .option('--compact', 'Print compact JSON.')
    .option('--describe', 'Describe all direct subcommands.')
    .option('--schema <command>', 'Inspect one direct subcommand schema.')
    .parse(['node', 'rsdoctor-agent', ...argv], { run: false });

  return {
    args: [...parsed.args],
    dataFile:
      typeof parsed.options.dataFile === 'string'
        ? parsed.options.dataFile
        : undefined,
    compact: parsed.options.compact === true,
    describe: parsed.options.describe === true,
    schema:
      typeof parsed.options.schema === 'string'
        ? parsed.options.schema
        : undefined,
  };
}

export async function runAiCli(
  argv: string[],
  options?: {
    write?: (text: string) => void;
    writeError?: (text: string) => void;
  },
): Promise<number> {
  const parsed = parseAiArgs(argv);
  try {
    return await route(parsed.args, {
      dataFile: parsed.dataFile,
      compact: parsed.compact,
      describe: parsed.describe,
      schema: parsed.schema,
      argv,
      write: options?.write,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    (options?.writeError ?? ((text: string) => process.stderr.write(text)))(
      `${message}\n`,
    );
    return 1;
  }
}

export {
  describeCommandSchema,
  describeCommands,
  describeRunSubcommands,
  describeSubcommands,
  getInProcessToolExecutors,
  getToolCatalog,
  route,
} from './router';
