import { describe, expect, it } from '@rstest/core';
import { File } from '@rsdoctor/utils/build';
import { tmpdir } from 'os';
import path from 'path';
const { RsdoctorWebpackPlugin } = require('../src');

describe('RsdoctorWebpackPlugin outputDir tests', () => {
  it('should set outputDir correctly for single instance', async () => {
    const testOutputDir = path.resolve(tmpdir(), `./test-output-${Date.now()}`);

    const plugin = new RsdoctorWebpackPlugin({
      disableClientServer: true,
      output: {
        reportDir: testOutputDir,
      },
    });

    // Mock compiler
    const mockCompiler = {
      outputPath: testOutputDir,
      isChild: () => false,
    } as any;

    // Call the done method to test outputDir setting
    await plugin.done(mockCompiler);

    // Verify the outputDir is set correctly
    expect(plugin.sdk.outputDir).toBe(
      path.resolve(testOutputDir, './.rsdoctor'),
    );

    // Clean up
    await File.fse.remove(testOutputDir);
  });

  it('should set outputDir correctly for outside instance with parent', async () => {
    const testOutputDir = path.resolve(
      tmpdir(),
      `./test-output-parent-${Date.now()}`,
    );

    const plugin = new RsdoctorWebpackPlugin({
      disableClientServer: true,
      output: {
        reportDir: testOutputDir,
      },
    });

    // Mark as outside instance and set parent
    plugin.outsideInstance = true;

    // Mock compiler
    const mockCompiler = {
      outputPath: testOutputDir,
      isChild: () => false,
    } as any;

    // Call the done method to test parent.master.setOutputDir
    await plugin.done(mockCompiler);

    // Verify both SDKs have the correct outputDir
    expect(plugin.sdk.outputDir).toBe(
      path.resolve(testOutputDir, './.rsdoctor'),
    );

    // Clean up
    await File.fse.remove(testOutputDir);
  });

  it('should use compiler.outputPath when reportDir is not provided', async () => {
    const testOutputDir = path.resolve(
      tmpdir(),
      `./test-compiler-output-${Date.now()}`,
    );

    const plugin = new RsdoctorWebpackPlugin({
      disableClientServer: true,
    });

    // Mock compiler with outputPath
    const mockCompiler = {
      outputPath: testOutputDir,
      isChild: () => false,
    } as any;

    // Call the done method to test outputDir setting
    await plugin.done(mockCompiler);

    // Verify the outputDir is set correctly
    expect(plugin.sdk.outputDir).toBe(
      path.resolve(testOutputDir, './.rsdoctor'),
    );

    // Clean up
    await File.fse.remove(testOutputDir);
  });

  it('should handle parent.master.setOutputDir for outside instance', async () => {
    const testOutputDir = path.resolve(
      tmpdir(),
      `./test-parent-master-${Date.now()}`,
    );

    const plugin = new RsdoctorWebpackPlugin({
      disableClientServer: true,
      output: {
        reportDir: testOutputDir,
      },
    });

    // Mark as outside instance and set parent
    plugin.outsideInstance = true;

    // Mock compiler
    const mockCompiler = {
      outputPath: testOutputDir,
      isChild: () => false,
    } as any;

    // Call the done method to test parent.master.setOutputDir
    await plugin.done(mockCompiler);

    // Verify both SDKs have the correct outputDir
    expect(plugin.sdk.outputDir).toBe(
      path.resolve(testOutputDir, './.rsdoctor'),
    );

    // Clean up
    await File.fse.remove(testOutputDir);
  });

  it('should not call parent.master.setOutputDir when not outside instance', async () => {
    const testOutputDir = path.resolve(
      tmpdir(),
      `./test-not-outside-${Date.now()}`,
    );

    const plugin = new RsdoctorWebpackPlugin({
      disableClientServer: true,
      output: {
        reportDir: testOutputDir,
      },
    });

    // Ensure outsideInstance is false and set parent
    plugin.outsideInstance = false;

    // Mock compiler
    const mockCompiler = {
      outputPath: testOutputDir,
      isChild: () => false,
    } as any;

    // Call the done method
    await plugin.done(mockCompiler);

    // Verify only the main SDK has the outputDir set, parent should remain empty
    expect(plugin.sdk.outputDir).toBe(
      path.resolve(testOutputDir, './.rsdoctor'),
    );

    // Clean up
    await File.fse.remove(testOutputDir);
  });
});
