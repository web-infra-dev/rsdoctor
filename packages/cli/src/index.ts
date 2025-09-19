import { cac } from 'cac';
import { red } from 'picocolors';
import { Common } from '@rsdoctor/types';
import { analyze, bundleDiff } from './commands';
import { Command, CommandContext, GetCommandArgumentsType } from './types';
import { Commands, pkg, bin } from './constants';
import { logger } from '@rsdoctor/utils/logger';
import { statsAnalyze } from './commands/stats-analyze';

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

  if (command === Commands.StatsAnalyze) {
    const { action } = statsAnalyze(ctx);

    return action(
      options as GetCommandArgumentsType<typeof statsAnalyze>['options'],
    );
  }

  if (command === Commands.BundleDiff) {
    const { action } = bundleDiff(ctx);

    return action(
      options as GetCommandArgumentsType<typeof bundleDiff>['options'],
    );
  }

  const cli = cac(bin);

  cli.version(version);
  cli.help();

  const commands: Command<string>[] = [analyze, bundleDiff, statsAnalyze];

  commands.forEach((cmd) => {
    const { command, description, options, action } = cmd(ctx);

    const commandCli = cli.command(command, description);

    options(commandCli);

    commandCli.action(async (args: any) => {
      try {
        if (command === Commands.Analyze && !args.profile) {
          logger.error(red(`❌ Missing required argument: --profile`));
          logger.info(`💡 Usage: ${bin} ${command} --profile <path>`);
          logger.info(`💡 Use --help to see all available options`);
          process.exit(1);
        }

        if (
          command === Commands.BundleDiff &&
          (!args.current || !args.baseline)
        ) {
          logger.error(
            red(`❌ Missing required arguments: --current and --baseline`),
          );
          logger.info(
            `💡 Usage: ${bin} ${command} --current <path> --baseline <path>`,
          );
          logger.info(`💡 Use --help to see all available options`);
          process.exit(1);
        }

        if (command === Commands.StatsAnalyze && !args.profile) {
          logger.error(red(`❌ Missing required argument: --profile`));
          logger.info(`💡 Usage: ${bin} ${command} --profile <path>`);
          logger.info(`💡 Use --help to see all available options`);
          process.exit(1);
        }

        await action(args);
      } catch (error) {
        const { message, stack } = error as Error;
        logger.error(red(stack || message));
        process.exit(1);
      }
    });
  });

  if (process.argv.length <= 2) {
    cli.outputHelp();
    return;
  }

  try {
    cli.parse();
  } catch (error) {
    const { message } = error as Error;

    if (message.includes('value is missing')) {
      logger.error(
        red(
          `❌ Missing required argument. Please provide a value for the option.`,
        ),
      );
      logger.info(`💡 Use --help to see available options`);
    } else if (message.includes('Unknown option')) {
      logger.error(red(`❌ Unknown option. Please check your command.`));
      logger.info(`💡 Use --help to see available options`);
    } else {
      logger.error(red(`❌ ${message}`));
    }

    process.exit(1);
  }
}
