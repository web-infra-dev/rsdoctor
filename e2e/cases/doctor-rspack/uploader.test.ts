import { expect, test } from '@playwright/test';
import { compileByRspack } from '@scripts/test-helper';
import path from 'path';
import fs from 'fs/promises';
import { Constants } from '@rsdoctor/types';
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

    await new Promise((resolve) => setTimeout(resolve, 2000));

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
    // Start a local client server or navigate to existing one
    await page.goto('http://localhost:8681/#/resources/uploader');

    // Verify uploader is loaded
    await expect(page.locator('.ant-upload-btn')).toBeVisible();

    // Create file content for upload
    const fileContent = JSON.stringify(manifestData);

    // Execute file upload in browser console
    const uploadResult = await page.evaluate(async (fileContent: any) => {
      // Create a File object from the JSON content
      const fileName = 'rsdoctor-manifest.json';
      const file = new File([fileContent], fileName, {
        type: 'application/json',
      });

      // Find the file input element
      const fileInput = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
      if (!fileInput) {
        throw new Error('File input not found');
      }

      // Create a DataTransfer object to simulate file selection
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      // Set the files property of the input
      Object.defineProperty(fileInput, 'files', {
        value: dataTransfer.files,
        writable: false,
      });

      // Dispatch change event to trigger upload
      const changeEvent = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(changeEvent);

      // Wait a bit for the upload to process
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return {
        success: true,
        fileName: fileName,
        fileSize: file.size,
        currentUrl: window.location.href,
      };
    }, fileContent);

    console.log('Upload result:', uploadResult);

    // Wait for navigation to overall page
    await page.waitForURL(/.*#\/overall.*/, { timeout: 10000 });

    // Verify successful navigation to overall page
    expect(page.url()).toContain('#/overall');

    // Verify data is properly mounted using browser console execution
    const windowData = await page.evaluate((tag) => {
      return (window as any)[tag];
    }, Constants.WINDOW_RSDOCTOR_TAG);

    expect(windowData).toBeDefined();

    // Verify the mounted data structure
    if (manifestData.data) {
      expect(windowData).toHaveProperty('errors');
      expect(windowData).toHaveProperty('moduleGraph');
      expect(windowData).toHaveProperty('chunkGraph');
    }

    // Verify enableRoutes are set
    if (manifestData.clientRoutes) {
      expect(windowData.enableRoutes).toEqual(manifestData.clientRoutes);
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
