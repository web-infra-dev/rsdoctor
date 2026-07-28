import type { Tap } from '@rspack/lite-tapable';

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
