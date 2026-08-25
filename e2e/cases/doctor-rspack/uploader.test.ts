import { expect, test } from '@test-kit/rstest';
import path from 'path';
import fs from 'fs/promises';
import { createRsdoctorPlugin } from './test-utils';

// Dynamic imports to avoid rspack binding issues
let compileByRspack: any;
const originalEnvRSTEST = process.env.RSTEST;
const rspackOutputDir = path.join(__dirname, './dist/uploader');
const manifestFileName = 'rsdoctor-data.json';

try {
  const testHelper = require('@scripts/test-helper');
  compileByRspack = testHelper.compileByRspack;
} catch (error) {
  console.warn(
    'Skipping uploader integration tests: Rspack binding is not available.',
    error,
  );
}

async function rspackCompile(compile: any) {
  const file = path.resolve(__dirname, './fixtures/c.js');

  const res = await compile(file, {
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
    plugins: [
      createRsdoctorPlugin({
        disableClientServer: false,
        output: {
          reportDir: rspackOutputDir,
          mode: 'brief',
          options: {
            type: ['json', 'html'],
          },
        },
        port: 8681,
      }),
    ],
  });

  return res;
}

// Integration test that uses real build artifacts
test.describe.skipIf(!compileByRspack)('Uploader Integration Tests', () => {
  let manifestPath: string;
  let manifestData: any;

  test.beforeAll(async () => {
    // RSTEST keeps the client server enabled in integration tests.
    process.env.RSTEST = 'true';

    try {
      await rspackCompile(compileByRspack);

      manifestPath = path.resolve(rspackOutputDir, manifestFileName);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      try {
        const manifestContent = await fs.readFile(manifestPath, 'utf-8');
        manifestData = JSON.parse(manifestContent);
      } catch (error) {
        throw new Error(
          `Failed to read generated Rsdoctor manifest at ${manifestPath}: ${
            error instanceof Error ? error.message : String(error)
          }`,
          { cause: error },
        );
      }
    } finally {
      process.env.RSTEST = originalEnvRSTEST;
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
        timeout: 10000,
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
      await page.waitForFunction(
        () => document.body.innerText.includes('Overall'),
        undefined,
        { timeout: 10000 },
      );
    }
  });

  test.afterAll(async () => {
    process.env.RSTEST = originalEnvRSTEST;

    try {
      await fs.rm(rspackOutputDir, {
        recursive: true,
        force: true,
      });
    } catch {
      // Ignore errors
    }
  });
});
