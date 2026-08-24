import { expect, test } from '@test-kit/rstest';
import path from 'path';
import fs from 'fs/promises';
import { tmpdir } from 'node:os';
import { createRsdoctorPlugin } from './test-utils';

// Dynamic imports to avoid rspack binding issues
let compileByRspack: any;
const rspackOutputDir = path.join(__dirname, './dist');
const manifestFileName = 'rsdoctor-data.json';

try {
  const testHelper = require('@scripts/test-helper');
  compileByRspack = testHelper.compileByRspack;
} catch {
  // The suite is skipped below when the native Rspack binding is unavailable.
}

async function rspackCompile(compile: any) {
  const file = path.resolve(__dirname, './fixtures/c.js');

  const doctor = createRsdoctorPlugin({
    disableClientServer: true,
    output: {
      reportDir: rspackOutputDir,
      mode: 'brief',
      options: {
        type: ['json', 'html'],
      },
    },
    server: { port: 0 },
  });

  await compile(file, {
    resolve: {
      extensions: ['.ts', '.js'],
    },
    output: {
      path: rspackOutputDir,
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
    plugins: [doctor],
  });

  await doctor.sdk.bootstrap();

  return doctor.sdk;
}

async function readManifest(filePath: string) {
  const deadline = Date.now() + 10_000;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      return JSON.parse(await fs.readFile(filePath, 'utf-8'));
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  throw new Error(`Failed to read generated Rsdoctor manifest at ${filePath}`, {
    cause: lastError,
  });
}

// Integration test that uses real build artifacts
test.describe.skipIf(!compileByRspack)('Uploader Integration Tests', () => {
  let manifestPath: string;
  let manifestData: any;
  let sdk: any;
  let serverOrigin: string;

  test.beforeAll(async () => {
    sdk = await rspackCompile(compileByRspack);
    serverOrigin = sdk.server.origin;

    manifestPath = path.resolve(rspackOutputDir, manifestFileName);
    manifestData = await readManifest(manifestPath);
  });

  test('should upload and analyze real build manifest', async ({ page }) => {
    await page.goto(`${serverOrigin}/#/resources/uploader`);

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
    const tempDir = await fs.mkdtemp(path.join(tmpdir(), 'rsdoctor-uploader-'));
    const tempFilePath = path.join(tempDir, 'manifest.json');
    await fs.writeFile(tempFilePath, fileContent);

    try {
      const navigationPromise = page.waitForURL(/.*#\/overall.*/, {
        timeout: 10_000,
      });

      // Use Playwright's file upload method
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(tempFilePath);

      await navigationPromise;

      expect(page.url()).toContain('#/overall');

      // Wait for the page to be fully loaded and data to be mounted
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
      // Clean up temporary upload data
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.warn('Failed to clean up temp file:', error);
      }
    }

    // Test that menus are rendered based on enableRoutes
    if (
      manifestData.clientRoutes &&
      manifestData.clientRoutes.includes('Overall')
    ) {
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
        } catch {
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
      await sdk?.dispose();
      await fs.rm(rspackOutputDir, {
        recursive: true,
        force: true,
      });
    } catch {
      // Ignore errors
    }
  });
});
