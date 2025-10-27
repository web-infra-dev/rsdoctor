import { expect, test } from '@playwright/test';
import path from 'path';
import fs from 'fs/promises';
import { getSDK, setSDK } from '@rsdoctor/core/plugins';
import { createRsdoctorPlugin } from '../doctor-rsbuild/test-utils';

// Dynamic imports to avoid rspack binding issues
let compileByRspack: any;
let Compiler: any;

try {
  const testHelper = require('@scripts/test-helper');
  compileByRspack = testHelper.compileByRspack;
  Compiler = require('@rspack/core').Compiler;
} catch (error) {
  // Skip tests if rspack is not available
  test.skip(true, 'Rspack binding not available, skipping all tests');
}

async function rspackCompile(_tapName: string, compile: any) {
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
        apply(compiler: any) {
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
    // Skip test if rspack binding is not available
    if (!compileByRspack || !Compiler) {
      test.skip(true, 'Rspack binding not available, skipping test');
      return;
    }
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
    // Skip test if rspack binding is not available
    if (!compileByRspack || !Compiler) {
      test.skip(true, 'Rspack binding not available, skipping test');
      return;
    }
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

      // Wait for the page to be fully loaded and data to be mounted
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Wait for data to be mounted and verify it's properly loaded
      await page.waitForFunction(
        (tag) => {
          const data = (window as any)[tag];
          return (
            data && data.errors !== undefined && data.moduleGraph !== undefined
          );
        },
        '__RSDOCTOR__',
        { timeout: 10000 },
      );

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
      // Wait for the page to fully load and render
      await page.waitForTimeout(2000);

      // Try multiple possible selectors for the Bundle Overall menu
      const possibleSelectors = [
        "text='Bundle Overall'",
        "[data-testid='bundle-overall']",
        "text='Overall'",
        ".ant-menu-item:has-text('Bundle Overall')",
        ".ant-menu-item:has-text('Overall')",
      ];

      let found = false;
      for (const selector of possibleSelectors) {
        try {
          const element = page.locator(selector).first();
          await expect(element).toBeVisible({ timeout: 3000 });
          found = true;
          break;
        } catch (error) {
          // Continue to next selector
          console.log(`Selector "${selector}" not found, trying next...`);
        }
      }

      if (!found) {
        // If none of the selectors work, log the page content for debugging
        const pageContent = await page.content();
        console.log('Page content:', pageContent.substring(0, 1000));
        throw new Error(
          'Could not find Bundle Overall menu item with any selector',
        );
      }
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
