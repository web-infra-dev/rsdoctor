import { expect as rstestExpect, test as rstestTest } from '@rstest/playwright';
import type { PlaywrightOptions } from '@rstest/playwright';

const isCI = Boolean(process.env.CI);

export const test = rstestTest.extend({
  playwright: {
    launchOptions: {
      channel: isCI ? 'chrome' : undefined,
      args: ['--experimental-modules', '--es-module-specifier-resolution=node'],
    },
  } satisfies PlaywrightOptions,
});

export const expect = rstestExpect;
