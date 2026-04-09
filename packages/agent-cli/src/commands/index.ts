import { route } from './router';

function parseAiArgs(argv: string[]) {
  const args = [...argv];
  const commandArgs: string[] = [];
  let dataFile: string | undefined;
  let compact = false;
  let describe = false;
  let schema: string | undefined;

  while (args.length > 0) {
    const current = args.shift();
    if (!current) {
      continue;
    }

    if (current === '--data-file') {
      dataFile = args.shift();
      continue;
    }

    if (current === '--compact') {
      compact = true;
      continue;
    }

    if (current === '--describe') {
      describe = true;
      continue;
    }

    if (current === '--schema') {
      schema = args.shift();
      continue;
    }

    commandArgs.push(current);
  }

  return {
    args: commandArgs,
    dataFile,
    compact,
    describe,
    schema,
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

export { describeCommandSchema, describeCommands, route } from './router';
