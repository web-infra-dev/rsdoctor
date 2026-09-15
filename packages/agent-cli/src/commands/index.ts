import { cac } from 'cac';

import { route } from './router';
import { formatCommandError } from './compiler-error';

function parseAiArgs(argv: string[]) {
  const cli = cac('rsdoctor-agent');
  const parsed = cli
    .option('--data-file <path>', 'Rsdoctor data file path.')
    .option('--compiler <name>', 'Compiler name from compilers list.')
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
    compiler: parsed.options.compiler as string | undefined,
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
  try {
    const parsed = parseAiArgs(argv);
    return await route(parsed.args, {
      dataFile: parsed.dataFile,
      compiler: parsed.compiler,
      compact: parsed.compact,
      describe: parsed.describe,
      schema: parsed.schema,
      argv,
      write: options?.write,
    });
  } catch (error) {
    const message = formatCommandError(error);
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
