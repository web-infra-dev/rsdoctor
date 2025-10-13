import ora from 'ora';
import { cyan, red } from 'picocolors';
import { Command } from '../types';
import path from 'path';
import fs from 'fs';
import {
  enhanceCommand,
  loadJSON,
  loadShardingFileWithSpinner,
} from '../utils';
import { Commands } from '../constants';
import {
  Client,
  Manifest as ManifestType,
  SDK,
  Constants,
} from '@rsdoctor/types';
import { Manifest, Algorithm } from '@rsdoctor/utils/common';
import { RsdoctorSDK } from '@rsdoctor/sdk';
import { createRequire } from 'node:module';

interface Options {
  current: string;
  baseline: string;
  open?: boolean;
  html?: boolean;
  output?: string;
}

export const bundleDiff: Command<
  Commands.BundleDiff,
  Options,
  RsdoctorSDK<{ name: string; root: string }> | null
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
      )
      .option('--html', 'output as a standalone HTML file')
      .option(
        '--output <path>',
        'output file path for HTML mode (default: rsdoctor-diff.html)',
      );
  },
  async action({
    baseline,
    current,
    open = true,
    html = false,
    output = 'rsdoctor-diff.html',
  }) {
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

    // Only start server if not in HTML mode
    if (!html) {
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

      return baselineSdk;
    }

    if (html) {
      spinner.text = 'Generating standalone HTML file...';

      const require = createRequire(import.meta.url);
      const clientHtmlPath = require.resolve('@rsdoctor/client/dist/diff.html');
      let htmlContent = fs.readFileSync(clientHtmlPath, 'utf-8');
      const basePath = path.dirname(clientHtmlPath);

      // Extract and inline scripts and styles
      const scriptSrcs = Array.from(
        htmlContent.matchAll(
          /<script[^>]+src=["']([^"']+)["'][^>]*><\/script>/g,
        ),
        (m) => m[1],
      );
      const cssHrefs = Array.from(
        htmlContent.matchAll(/<link\s+href=["'](.+?)["']\s+rel="stylesheet">/g),
        (m) => m[1],
      );

      htmlContent = htmlContent.replace(
        /<script\s+.*?src=["'].*?["']><\/script>/g,
        '',
      );
      htmlContent = htmlContent.replace(
        /<link\s+.*?rel=["']stylesheet["'].*?>/g,
        '',
      );

      // Inline scripts
      const inlinedScripts = scriptSrcs
        .map((src) => {
          const scriptPath = path.resolve(basePath, src);
          try {
            const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
            return `<script>${scriptContent}</script>`;
          } catch (error) {
            console.error(`Could not read script at ${scriptPath}:`, error);
            return '';
          }
        })
        .join('');

      // Inline styles
      const inlinedStyles = cssHrefs
        .map((href) => {
          const cssPath = path.resolve(basePath, href);
          try {
            const cssContent = fs.readFileSync(cssPath, 'utf-8');
            return `<style>${cssContent}</style>`;
          } catch (error) {
            console.error(`Could not read CSS at ${cssPath}:`, error);
            return '';
          }
        })
        .join('');

      // Add inlined resources
      const index = htmlContent.indexOf('</body>');
      htmlContent =
        htmlContent.slice(0, index) +
        inlinedStyles +
        inlinedScripts +
        htmlContent.slice(index);

      // Add compressed data
      const baselineCompressText = Algorithm.compressText(
        JSON.stringify(baselineDataValue),
      );
      const currentCompressText = Algorithm.compressText(
        JSON.stringify(currentDataValue),
      );

      const scripts = [
        // Initialize window object
        `window.${Constants.WINDOW_RSDOCTOR_TAG} = {};`,
        `window.${Constants.WINDOW_RSDOCTOR_TAG}.baseline = ${JSON.stringify(baselineCompressText)};`,
        `window.${Constants.WINDOW_RSDOCTOR_TAG}.current = ${JSON.stringify(currentCompressText)};`,
        `window.${Constants.WINDOW_RSDOCTOR_TAG}.enableRoutes = ${JSON.stringify([Client.RsdoctorClientRoutes.BundleDiff])};`,
        `window.${Constants.WINDOW_RSDOCTOR_TAG}.mode = 'diff';`,
      ];

      const compressTextScripts = scripts
        .map((script) => `<script>${script}</script>`)
        .join('\n');

      htmlContent = htmlContent.replace(
        '<body>',
        `<body>${compressTextScripts}`,
      );

      // Write the output file
      const outputPath = path.resolve(cwd, output);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, htmlContent, 'utf-8');

      spinner.succeed(`Generated standalone HTML file at: ${outputPath}`);
      return null;
    }

    return null;
  },
}));
