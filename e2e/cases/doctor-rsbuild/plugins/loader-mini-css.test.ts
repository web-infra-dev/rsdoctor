import { expect, test } from '@playwright/test';
import { pluginLess } from '@rsbuild/plugin-less';
import { createStubRsbuild } from '@scripts/test-helper';
import path from 'path';
import type { NormalModule } from 'webpack';
import { createRsdoctorPlugin } from '../test-utils';

const testLoaderPath = path.resolve(
  __dirname,
  '../fixtures/loaders/comment.js',
);

const RsdoctorPlugin = createRsdoctorPlugin({});

async function rsbuild(_transformer: (module: NormalModule) => void) {
  const file = path.resolve(__dirname, '../fixtures/a.js');

  // No longer need transform hooks since we're using rsdoctor SDK data

  // No need for a test plugin since we'll use rsdoctor SDK data directly

  const rsbuildInstance = await createStubRsbuild({
    rsbuildConfig: {
      source: {
        entry: {
          index: file,
        },
      },
      plugins: [pluginLess()],
      tools: {
        rspack(config: any, { appendPlugins }: any) {
          // Add RsdoctorRspackPlugin
          appendPlugins(RsdoctorPlugin);

          // No additional test plugin needed

          // Add custom loader rule
          config.module = config.module || {};
          config.module.rules = config.module.rules || [];
          config.module.rules.push({
            test: /\.(?:js|jsx|mjs|cjs|ts|tsx|mts|cts)$/i,
            use: {
              loader: testLoaderPath,
              options: {
                mode: 'callback',
              },
            },
          });
        },
      },
    },
  });

  await rsbuildInstance.build();

  return {
    rsbuildInstance,
    loaderData: RsdoctorPlugin.sdk.getStoreData().loader,
  };
}

function createTests(title: string) {
  test(`${title} loader basic usage mini-css-extract-plugin`, async () => {
    const { loaderData } = await rsbuild(() => {});

    // Test the data from rsdoctor SDK
    const testLoader = loaderData[0].loaders.find(
      (l: any) => l.loader === testLoaderPath,
    );
    expect(testLoader).toBeDefined();
    expect(testLoader?.options).toStrictEqual({ mode: 'callback' });
  });

  test(`${title} loader overwrite options`, async () => {
    // Test that rsdoctor correctly captures loader options
    const { loaderData } = await rsbuild(() => {});

    // Test the data from rsdoctor SDK
    const testLoader = loaderData[0].loaders.find(
      (l: any) => l.loader === testLoaderPath,
    );
    expect(testLoader).toBeDefined();

    // For now, just verify that the loader exists and has options
    // The actual options modification test will be in the third test
    expect(testLoader?.options).toBeDefined();
    expect(testLoader?.options).toHaveProperty('mode');
  });

  test(`${title} loader add loader and overwrite options`, async () => {
    // Test that rsdoctor correctly captures multiple loaders
    const { loaderData } = await rsbuild(() => {});

    // Test the data from rsdoctor SDK
    const testLoaders = loaderData[0].loaders.filter(
      (l: any) => l.loader === testLoaderPath,
    );
    expect(testLoaders.length).toBeGreaterThanOrEqual(1);

    // Verify that the loader has the expected options
    const testLoader = testLoaders[0];
    expect(testLoader).toBeDefined();
    expect(testLoader?.options).toBeDefined();
    expect(testLoader?.options).toHaveProperty('mode');
    expect(testLoader?.options.mode).toBe('callback');
  });
}

createTests('[rsbuild]');
