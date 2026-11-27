import { RsdoctorSDK } from '@rsdoctor/core';
import { Manifest, Url } from '@rsdoctor/shared/common-browser';
import {
  Constants,
  Manifest as ManifestType,
  SDK,
} from '@rsdoctor/shared/types';
import ora, { type Ora } from 'ora';
import { color } from 'rslog';
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

interface Report {
  json: ManifestType.RsdoctorManifestWithShardingFiles;
  data: ManifestType.RsdoctorManifestData;
}

async function loadReport(
  profile: string,
  cwd: string,
  spinner: Ora,
): Promise<Report> {
  spinner.text = `start to loading "${profile}"`;

  const json = await loadJSON<ManifestType.RsdoctorManifestWithShardingFiles>(
    profile,
    cwd,
  );
  const load = (url: string) => loadShardingFileWithSpinner(url, cwd, spinner);

  try {
    return { json, data: await Manifest.fetchShardingFiles(json.data, load) };
  } catch (error) {
    try {
      return {
        json,
        data: await Manifest.fetchShardingFiles(json.cloudData || {}, load),
      };
    } catch {
      throw error;
    }
  }
}

function resolveSeriesPath(profile: string, seriesPath: string) {
  if (!Url.isUrl(profile)) return seriesPath;
  if (Url.isFilePath(seriesPath)) return;

  const url = new URL(seriesPath, profile);
  return url.origin === new URL(profile).origin ? url.href : undefined;
}

export const analyze: Command<Commands.Analyze, Options, RsdoctorSDK> =
  enhanceCommand(({ cwd, name, bin }) => ({
    command: Commands.Analyze,
    description: `
use ${name} to open "${Constants.RsdoctorOutputManifestPath}" in browser for analysis.

example: ${bin} ${Commands.Analyze} --profile "${Constants.RsdoctorOutputManifestPath}"

`.trim(),
    options(cli) {
      cli
        .option('--profile <path>', 'profile for Rsdoctor server')
        .option(
          '--no-open',
          'turn off it if you need not open browser automatically',
        )
        .option('--port <number>', 'port for Rsdoctor Server');
    },
    async action({ profile, open = true, port, type = SDK.ToDataType.Normal }) {
      const spinner = ora({ prefixText: color.cyan(`[${name}]`) }).start(
        `start to loading "${profile}"`,
      );
      const sdks = new Map<string | undefined, RsdoctorSDK>();

      const createSdk = (
        compiler: string | undefined,
        { json, data }: Report,
        port?: number,
      ) => {
        const sdk = new RsdoctorSDK({
          name: compiler ?? name,
          root: cwd,
          type,
          config: {
            server: {
              port,
            },
          },
        });

        sdk.getStoreData = () => data;
        sdk.getManifestData = () => ({
          ...json,
          series: json.series
            ?.filter((item) => sdks.has(item.name) || item.origin)
            .map((item) => ({
              ...item,
              origin: sdks.get(item.name)?.server.origin ?? item.origin,
            })),
          __LOCAL__SERVER__: true,
          __SOCKET__PORT__: sdk.server.socketUrl.port.toString(),
          __SOCKET__URL__: sdk.server.socketUrl.socketUrl,
        });
        sdks.set(compiler, sdk);

        return sdk;
      };

      const report = await loadReport(profile, cwd, spinner).catch(
        (error: Error) => {
          spinner.fail(color.red(error.message));
          throw error;
        },
      );

      const sdk = createSdk(report.json.name, report, port);

      for (const item of report.json.series ?? []) {
        if (item.name === report.json.name) continue;

        try {
          const location = resolveSeriesPath(profile, item.path);
          if (!location) {
            throw new Error(`"${item.path}" is outside "${profile}"`);
          }
          createSdk(item.name, await loadReport(location, cwd, spinner));
        } catch (error) {
          spinner.warn(
            `skip compiler "${item.name}": ${(error as Error).message}`,
          );
          spinner.start(`start to loading data...`);
        }
      }

      const dispose = sdk.dispose.bind(sdk);
      sdk.dispose = async () => {
        await Promise.all(
          [...sdks.values()].map((item) =>
            item === sdk ? dispose() : item.dispose(),
          ),
        );
      };

      spinner.text = `start server`;

      try {
        for (const item of sdks.values()) {
          await item.bootstrap({ isDefaultMcpPort: item === sdk });
        }
      } catch (error) {
        await sdk.dispose();
        throw error;
      }

      if (open) {
        spinner.succeed(`open browser automatically`);

        await sdk.server.openClientPage('homepage');
      }

      spinner.succeed(
        `the local url: ${color.cyan(sdk.server.getClientUrl('homepage'))}`,
      );

      return sdk;
    },
  }));
