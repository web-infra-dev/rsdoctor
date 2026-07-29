import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { Tap } from '@rspack/lite-tapable';

const require = createRequire(import.meta.url);
const packageJsonPath = existsSync(new URL('../package.json', import.meta.url))
  ? '../package.json'
  : '../../package.json';
const packageJson = require(packageJsonPath) as { version: string };

export const pluginTapName = 'RsdoctorRspackPlugin';

export const pluginTapPostOptions: Tap = {
  name: pluginTapName,
  stage: 999,
};

export const pluginTapPreOptions: Tap = {
  name: pluginTapName,
  stage: -999,
};

export const internalPluginTapPreOptions = (namespace: string): Tap => ({
  name: `${pluginTapName}:${namespace}`,
  stage: -998,
});

export const internalPluginTapPostOptions = (namespace: string): Tap => ({
  name: `${pluginTapName}:${namespace}`,
  stage: 1000,
});

export const pkg = packageJson;
