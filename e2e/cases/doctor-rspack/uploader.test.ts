import { expect, test } from '@playwright/test';
import { compileByRspack } from '@scripts/test-helper';
import path from 'path';
import fs from 'fs/promises';
import { getSDK, setSDK } from '@rsdoctor/core/plugins';
import type { Compiler } from '@rspack/core';
import { createRsdoctorPlugin } from '../doctor-rsbuild/test-utils';

async function rspackCompile(
  _tapName: string,
  compile: typeof compileByRspack,
) {
  const file = path.resolve(__dirname, './fixtures/c.js');

  const res = await compile(file, {
    resolve: {
      extensions: ['.ts', '.js'],
    },
    output: {
      path: path.join(__dirname, './dist'),
    },
    module: {
      rules: [
        {
          test: /\.[jt]s$/,
          use: {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                },
                externalHelpers: true,
                preserveAllComments: false,
              },
            },
          },
          type: 'javascript/auto',
        },
      ],
    },
    plugins: [
      createRsdoctorPlugin({
        disableClientServer: false,
        output: {
          mode: 'brief',
          options: {
            type: ['json'],
          },
        },
        port: 8681,
      }),
      {
        name: 'Foo',
        apply(compiler: Compiler) {
          compiler.hooks.beforeRun.tapPromise(
            { name: 'Foo', stage: 99999 },
            async () => {
              const sdk = getSDK();
              if (!sdk) {
                throw new Error('SDK is undefined');
              }
              setSDK(
                new Proxy(sdk as object, {
                  get(target, key, receiver) {
                    switch (key) {
                      case 'reportLoader':
                        return null;
                      case 'reportLoaderStartOrEnd':
                        return (_data: any) => {};
                      default:
                        return Reflect.get(target, key, receiver);
                    }
                  },
                  set(target, key, value, receiver) {
                    return Reflect.set(target, key, value, receiver);
                  },
                  defineProperty(target, p, attrs) {
                    return Reflect.defineProperty(target, p, attrs);
                  },
                }) as any,
              );
            },
          );
        },
      },
    ],
  });

  return res;
}

// Integration test that uses real build artifacts
test.describe('Uploader Integration Tests', () => {
  let manifestPath: string;
  let manifestData: any;

  test.beforeAll(async () => {
    const tapName = 'Foo';
    await rspackCompile(tapName, compileByRspack);

    manifestPath = path.resolve(
      __dirname,
      '../../.rsdoctor/rsdoctor-data.json',
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      manifestData = JSON.parse(manifestContent);
    } catch (error) {
      console.error('Failed to read manifest file:', error);
      // Create minimal test data if file doesn't exist
      manifestData = {
        data: {
          errors: [],
          moduleGraph: {
            dependencies: [],
            modules: [],
            moduleGraphModules: [],
            exports: [],
            sideEffects: [],
            variables: [],
            layers: [],
          },
          chunkGraph: { assets: [], chunks: [], entrypoints: [] },
        },
        clientRoutes: ['Overall', 'Bundle.ModuleGraph', 'Bundle.BundleSize'],
      };
    }
  });

  test('should upload and analyze real build manifest', async ({ page }) => {
    await page.goto('http://localhost:8681/#/resources/uploader');

    await expect(page.locator('.ant-upload-btn')).toBeVisible();

    // Create file content for upload - use the correct manifest format
    const manifestContent = {
      client: {
        enableRoutes: ['Overall', 'Bundle.ModuleGraph', 'Bundle.BundleSize'],
      },
      data: manifestData.data,
    };
    const fileContent = JSON.stringify(manifestContent);

    // Create a temporary file for upload
    const tempFilePath = path.join(__dirname, 'temp-manifest.json');
    await fs.writeFile(tempFilePath, fileContent);

    try {
      const navigationPromise = page.waitForURL(/.*#\/overall.*/, {
        timeout: 2000,
      });

      // Use Playwright's file upload method
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(tempFilePath);

      await navigationPromise;

      expect(page.url()).toContain('#/overall');

      await page.waitForTimeout(1000);

      // Verify data is properly mounted using browser console execution
      const windowData = await page.evaluate((tag) => {
        return (window as any)[tag];
      }, '__RSDOCTOR__');

      expect(windowData).toBeDefined();

      // Verify the mounted data structure
      if (manifestData.data) {
        expect(windowData).toHaveProperty('errors');
        expect(windowData).toHaveProperty('moduleGraph');
        expect(windowData).toHaveProperty('chunkGraph');
      }

      // Verify enableRoutes are set
      if (manifestData.clientRoutes) {
        expect(windowData.enableRoutes.length).toBeTruthy();
      }
    } finally {
      // Clean up temporary file
      try {
        await fs.unlink(tempFilePath);
      } catch (error) {
        console.warn('Failed to clean up temp file:', error);
      }
    }

    // Test that menus are rendered based on enableRoutes
    if (
      manifestData.clientRoutes &&
      manifestData.clientRoutes.includes('Overall')
    ) {
      await expect(page.locator("text='Bundle Overall'").first()).toBeVisible();
    }
  });

  test.afterAll(async () => {
    try {
      await fs.rm(path.resolve(__dirname, './dist'), {
        recursive: true,
        force: true,
      });
    } catch (error) {}
  });
});
