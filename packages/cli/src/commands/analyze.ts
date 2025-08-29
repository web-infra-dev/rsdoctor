import { Manifest } from '@rsdoctor/utils/common';
import { Constants, Manifest as ManifestType, SDK } from '@rsdoctor/types';
import { RsdoctorSDK } from '@rsdoctor/sdk';
import ora from 'ora';
import { cyan, red } from 'picocolors';
import { Command } from '../types';
import {
  enhanceCommand,
  loadJSON,
  loadShardingFileWithSpinner,
} from '../utils';
import { Commands } from '../constants';

interface Options {
  profile: string;
  open?: boolean;
  port?: number;
  type?: SDK.ToDataType;
}

export const analyze: Command<Commands.Analyze, Options, RsdoctorSDK> =
  enhanceCommand(({ cwd, name, bin }) => ({
    command: Commands.Analyze,
    description: `
use ${name} to open "${Constants.RsdoctorOutputManifestPath}" in browser for analysis.

example: ${bin} ${Commands.Analyze} --profile "${Constants.RsdoctorOutputManifestPath}"

`.trim(),
    options(yargs) {
      yargs
        .option('profile', {
          type: 'string',
          description: 'profile for Rsdoctor server',
          demandOption: true,
        })
        .option('open', {
          type: 'boolean',
          description: 'turn off it if you need not open browser automatically',
          default: true,
        })
        .option('port', {
          type: 'number',
          description: 'port for Rsdoctor Server',
        });
    },
    async action({ profile, open = true, port, type = SDK.ToDataType.Normal }) {
      const spinner = ora({ prefixText: cyan(`[${name}]`) }).start(
        `start to loading "${profile}"`,
      );

      const json =
        await loadJSON<ManifestType.RsdoctorManifestWithShardingFiles>(
          profile,
          cwd,
        );

      spinner.text = `start to loading data...`;

      let dataValue: ManifestType.RsdoctorManifestData;

      try {
        dataValue = await Manifest.fetchShardingFiles(
          json.data,
          (url: string) => loadShardingFileWithSpinner(url, cwd, spinner),
        );
      } catch (error) {
        try {
          dataValue = await Manifest.fetchShardingFiles(
            json.cloudData || {},
            (url: string) => loadShardingFileWithSpinner(url, cwd, spinner),
          );
        } catch (e) {
          spinner.fail(red((error as Error).message));
          throw error;
        }
      }

      spinner.text = `start server`;

      const sdk = new RsdoctorSDK({ name, root: cwd, port, type });

      await sdk.bootstrap();

      sdk.getStoreData = () => dataValue;
      sdk.getManifestData = () => json;

      const manifestBuffer = Buffer.from(
        JSON.stringify({ ...json, __LOCAL__SERVER__: true }),
      );

      sdk.server.proxy(SDK.ServerAPI.API.Manifest, 'GET', () => manifestBuffer);

      if (open) {
        spinner.text = `open browser automatically`;

        await sdk.server.openClientPage('homepage');
      }

      spinner.succeed(
        `the local url: ${cyan(sdk.server.getClientUrl('homepage'))}`,
      );

      return sdk;
    },
  }));
