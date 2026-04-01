import { Command } from '../../types';
import { Commands } from '../../constants';
import { route } from './router';

interface AiOptions {
  args: string[];
  dataFile?: string;
  compact?: boolean;
  describe?: boolean;
  schema?: string;
}

export const ai: Command<Commands.AI, AiOptions, void> = (_ctx) => ({
  command: Commands.AI,
  description: 'AI-powered build analysis from rsdoctor-data.json',
  options(cli) {
    cli.option('--data-file <path>', 'Path to rsdoctor-data.json file');
    cli.option('--compact', 'Compact JSON output');
    cli.option('--describe', 'Output JSON schema of all available subcommands');
    cli.option(
      '--schema <command>',
      'Inspect input schema for a specific command (e.g. chunks.list)',
    );
    cli.allowUnknownOptions();
  },
  async action(options: AiOptions) {
    await route(options.args || [], {
      dataFile: options.dataFile,
      compact: options.compact,
      describe: options.describe,
      schema: options.schema,
    });
  },
});
