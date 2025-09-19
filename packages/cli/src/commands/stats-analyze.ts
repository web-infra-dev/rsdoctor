import { RsdoctorSDK } from '@rsdoctor/sdk';
import { Constants, Manifest as ManifestType, SDK } from '@rsdoctor/types';
import { cyan } from 'picocolors';
import ora from 'ora';
import { Commands } from '../constants';
import { Command } from '../types';
import { enhanceCommand, readFile } from '../utils';
import { StatsCompilation } from '@rsdoctor/types/src/plugin';
import { TransUtils } from '@rsdoctor/graph';

interface Options {
  profile: string;
  open?: boolean;
  port?: number;
  type?: SDK.ToDataType;
}

export const statsAnalyze: Command<
  Commands.StatsAnalyze,
  Options,
  RsdoctorSDK
> = enhanceCommand(({ cwd, name, bin }) => ({
  command: Commands.StatsAnalyze,
  description:
    `use ${name} to open "${Constants.RsdoctorOutputManifestPath}" in browser for analysis.example: ${bin} ${Commands.StatsAnalyze} --profile "${Constants.StatsFilePath}"`.trim(),
  options(cli) {
    cli
      .option(
        '--profile <path>',
        'Path to webpack stats.json file for analysis',
      )
      .option('--port <number>', 'port for Rsdoctor Server')
      .option('--type <mode>', 'Bundle analysis mode (normal or lite)');
  },
  async action({ profile, open = true, type = SDK.ToDataType.Normal }) {
    const spinner = ora({ prefixText: cyan(`[${name}]`) }).start(
      `start to loading "${profile}"`,
    );
    const statsStrings = await readFile(profile, cwd);
    const json = JSON.parse(statsStrings) as StatsCompilation;

    spinner.text = `start server`;
    const { chunkGraph, moduleGraph } = await TransUtils.transStats(json);

    const sdk = new RsdoctorSDK({
      name: 'stats-analyze',
      root: process.cwd(),
      type,
      noServer: false,
    });

    await sdk.bootstrap();
    sdk.reportChunkGraph(chunkGraph);
    sdk.reportModuleGraph(moduleGraph);
    sdk.addClientRoutes([
      ManifestType.RsdoctorManifestClientRoutes.Overall,
      ManifestType.RsdoctorManifestClientRoutes.BundleSize,
      ManifestType.RsdoctorManifestClientRoutes.ModuleGraph,
    ]);

    if (open) {
      spinner.succeed(`open browser automatically`);

      await sdk.server.openClientPage('homepage');
    }

    spinner.succeed(
      `the local url: ${cyan(sdk.server.getClientUrl('homepage'))}`,
    );

    return sdk;
  },
}));
