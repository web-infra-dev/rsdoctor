import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';
import { Common } from '@rsdoctor/types';
import { analyze, bundleDiff } from './commands';
import { Command, CommandContext, GetCommandArgumentsType } from './types';
import { Commands, pkg, bin } from './constants';

export async function execute<
  T extends GetCommandArgumentsType<typeof analyze>,
>(
  command: Commands.Analyze | `${Commands.Analyze}`,
  options: T['options'],
): Promise<T['result']>;

export async function execute<
  T extends GetCommandArgumentsType<typeof bundleDiff>,
>(
  command: Commands.BundleDiff | `${Commands.BundleDiff}`,
  options: T['options'],
): Promise<T['result']>;

export async function execute(): Promise<void>;
export async function execute(
  command?: `${Commands}` | Commands,
  options?: Common.PlainObject,
): Promise<unknown> {
  const cwd = process.cwd();
  const { name, version } = pkg;

  const ctx: CommandContext = { bin, cwd, name };

  if (command === Commands.Analyze) {
    const { action } = analyze(ctx);

    return action(
      options as GetCommandArgumentsType<typeof analyze>['options'],
    );
  }

  if (command === Commands.BundleDiff) {
    const { action } = bundleDiff(ctx);

    return action(
      options as GetCommandArgumentsType<typeof bundleDiff>['options'],
    );
  }

  const argv = hideBin(process.argv);
  const args = yargs(argv).usage(`${bin} <command> [options]`);

  args.version(version);

  const commands: Command<string>[] = [analyze, bundleDiff];

  commands.forEach((cmd) => {
    const { command, description, options, action } = cmd(ctx);

    args.command(
      command,
      description,
      (yargs) => {
        return options(yargs.usage(`${bin} ${command} [options]`));
      },
      async (args) => {
        try {
          await action(args);
        } catch (error) {
          const { message, stack } = error as Error;
          console.log('');
          console.error(chalk.red(stack || message));
          process.exit(1);
        }
      },
    );
  });

  if (!argv.length) {
    args.showHelp();
  }

  await args.parse();
}
