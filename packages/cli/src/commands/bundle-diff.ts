import ora from 'ora';
import { cyan, red } from 'picocolors';
import { Command } from '../types';
import {
  enhanceCommand,
  loadJSON,
  loadShardingFileWithSpinner,
} from '../utils';
import { Commands } from '../constants';
import { Client, Manifest as ManifestType, SDK } from '@rsdoctor/types';
import { Manifest } from '@rsdoctor/utils/common';
import { RsdoctorSDK } from '@rsdoctor/sdk';

interface Options {
  current: string;
  baseline: string;
  open?: boolean;
}

export const bundleDiff: Command<
  Commands.BundleDiff,
  Options,
  RsdoctorSDK<{ name: string; root: string }>
> = enhanceCommand(({ cwd, bin, name }) => ({
  command: Commands.BundleDiff,
  description: `
use ${name} to open the bundle diff result in browser for analysis.

example: ${bin} ${Commands.BundleDiff} --baseline="x.json" --current="x.json"
`.trim(),
  options(cli) {
    cli
      .option(
        '--current <path>',
        'the url or file path of the profile json as the current',
      )
      .option(
        '--baseline <path>',
        'the url or file path of the profile json as the baseline',
      );
  },
  async action({ baseline, current, open = true }) {
    const spinner = ora({ prefixText: cyan(`[${name}]`) }).start();

    spinner.text = `loading "${baseline}"`;
    const baselineData = {
      ...(await loadJSON<ManifestType.RsdoctorManifestWithShardingFiles>(
        baseline,
        cwd,
      )),
      client: {
        enableRoutes: [],
      },
    };

    let baselineDataValue: ManifestType.RsdoctorManifestData;

    try {
      baselineDataValue = await Manifest.fetchShardingFiles(
        baselineData.data,
        (url) => loadShardingFileWithSpinner(url, cwd, spinner),
      );
    } catch (error) {
      if (baselineData.cloudData) {
        spinner.text =
          'load the "baselineData.cloudData" instead of the "baselineData.data"';
        baselineDataValue = await Manifest.fetchShardingFiles(
          baselineData.cloudData,
          (url) => loadShardingFileWithSpinner(url, cwd, spinner),
        );
      } else {
        spinner.fail(red((error as Error).message));
        throw error;
      }
    }

    spinner.text = `loading "${current}"`;
    const currentData = {
      ...(await loadJSON<ManifestType.RsdoctorManifestWithShardingFiles>(
        current,
        cwd,
      )),
      client: {
        enableRoutes: [],
      },
    };

    let currentDataValue: ManifestType.RsdoctorManifestData;

    try {
      currentDataValue = await Manifest.fetchShardingFiles(
        currentData.data,
        (url) => loadShardingFileWithSpinner(url, cwd, spinner),
      );
    } catch (error) {
      if (currentData.cloudData) {
        spinner.text =
          'load the "currentData.cloudData" instead of the "currentData.data"';
        currentDataValue = await Manifest.fetchShardingFiles(
          currentData.cloudData,
          (url) => loadShardingFileWithSpinner(url, cwd, spinner),
        );
      } else {
        spinner.fail(red((error as Error).message));
        throw error;
      }
    }

    spinner.text = `start server`;

    const baselineSdk = new RsdoctorSDK({ name, root: cwd });
    const currentSdk = new RsdoctorSDK({ name, root: cwd });

    await Promise.all([baselineSdk.bootstrap(), currentSdk.bootstrap()]);

    const baselineManifestsBuffer = Buffer.from(
      JSON.stringify({
        __LOCAL__SERVER__: true,
        __SOCKET__URL__: baselineSdk.server.socketUrl.socketUrl,
        __SOCKET__PORT__: baselineSdk.server.socketUrl.port,
        ...baselineData,
      }),
    );
    const currentManifestsBuffer = Buffer.from(
      JSON.stringify({
        __LOCAL__SERVER__: true,
        __SOCKET__PORT__: currentSdk.server.socketUrl.port,
        __SOCKET__URL__: currentSdk.server.socketUrl.socketUrl,
        ...currentData,
      }),
    );

    baselineSdk.getStoreData = () => baselineDataValue;
    currentSdk.getStoreData = () => currentDataValue;
    baselineSdk.getManifestData = () => baselineData;
    currentSdk.getManifestData = () => currentData;

    baselineSdk.server.proxy(
      SDK.ServerAPI.API.BundleDiffManifest,
      'GET',
      () => baselineManifestsBuffer,
    );
    currentSdk.server.proxy(
      SDK.ServerAPI.API.BundleDiffManifest,
      'GET',
      () => currentManifestsBuffer,
    );

    spinner.text = `server bootstrap success`;

    const localBaselineManifestUrl =
      baselineSdk.server.origin + SDK.ServerAPI.API.BundleDiffManifest;
    const localCurrentManifestUrl =
      currentSdk.server.origin + SDK.ServerAPI.API.BundleDiffManifest;

    baselineSdk.server.getClientUrl(
      Client.RsdoctorClientRoutes.BundleDiff,
      localBaselineManifestUrl,
      localCurrentManifestUrl,
    );

    if (open) {
      await baselineSdk.server.openClientPage(
        Client.RsdoctorClientRoutes.BundleDiff,
        localBaselineManifestUrl,
        localCurrentManifestUrl,
      );
    }

    spinner.succeed(`Bundle Diff page has been open.`);

    return baselineSdk;
  },
}));
