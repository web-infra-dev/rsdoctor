import { describe, expect, it, beforeEach, afterEach } from '@rstest/core';
import { normalizeUserConfig } from '../../../src/inner-plugins/utils/config';
import { SDK } from '@rsdoctor/types';

// Mock console.log to capture warning messages
const originalConsoleLog = console.log;
let consoleOutput: string[] = [];
const originalEnvCI = process.env.CI;
const originalEnvRSTEST = process.env.RSTEST;

beforeEach(() => {
  consoleOutput = [];
  console.log = (...args: any[]) => {
    consoleOutput.push(args.join(' '));
  };
  delete process.env.CI;
  delete process.env.RSTEST;
});

afterEach(() => {
  console.log = originalConsoleLog;
  if (originalEnvCI !== undefined) {
    process.env.CI = originalEnvCI;
  } else {
    delete process.env.CI;
  }
  if (originalEnvRSTEST !== undefined) {
    process.env.RSTEST = originalEnvRSTEST;
  } else {
    delete process.env.RSTEST;
  }
});

describe('normalizeUserConfig', () => {
  it('should use all default values when config is empty', () => {
    const result = normalizeUserConfig();
    expect(result.linter).toBeDefined();
    expect(result.features).toEqual({
      bundle: true,
      lite: false,
      loader: true,
      plugins: true,
      resolver: false,
      treeShaking: false,
    });
    expect(result.output.reportCodeType).toBeDefined();
    // @ts-ignore
    expect(result.output.compressData).toBe(undefined);
    expect(result.output.mode).toBe('normal');
  });

  it('should handle compressData configuration correctly', () => {
    const result = normalizeUserConfig({
      output: {
        compressData: true,
      },
    });

    // compressData is deprecated and not included in final output
    expect(result.output).not.toHaveProperty('compressData');
  });

  it('should respect custom features array', () => {
    const result = normalizeUserConfig({
      features: ['loader', 'plugins', 'lite'],
    });
    expect(result.features.loader).toBe(true);
    expect(result.features.plugins).toBe(true);
    expect(result.features.lite).toBe(true);
    expect(result.features.resolver).toBe(false);
    expect(result.output.reportCodeType).toBe(SDK.ToDataType.NoSourceAndAssets);
  });

  it('should respect custom features object', () => {
    const result = normalizeUserConfig({
      features: { loader: false, plugins: true, lite: true },
    });
    expect(result.features.loader).toBe(false);
    expect(result.features.plugins).toBe(true);
    expect(result.features.lite).toBe(true);
  });

  it('should normalize output.reportCodeType according to mode', () => {
    const result = normalizeUserConfig({
      output: { reportCodeType: { noCode: true } },
      mode: 'brief',
    });
    expect(result.output.reportCodeType).toBe(SDK.ToDataType.NoCode);
  });

  it('should normalize output.reportCodeType and mode:lite', () => {
    const result = normalizeUserConfig({
      output: { reportCodeType: { noCode: true } },
      mode: 'lite',
    });
    expect(result.output.reportCodeType).toBe(SDK.ToDataType.NoCode);
  });

  it('should use default supports when not provided', () => {
    const result = normalizeUserConfig();
    expect(result.supports.banner).toEqual(undefined);
    expect(result.supports.gzip).toEqual(true);
    expect(result.supports.parseBundle).toEqual(true);
  });

  it('should respect custom supports', () => {
    const customSupports = {
      parseBundle: false,
      banner: true,
      gzip: true,
    };
    const result = normalizeUserConfig({ supports: customSupports });
    expect(result.supports).toEqual(customSupports);
  });

  describe('mode configuration warnings', () => {
    it('should show warning when using deprecated mode configuration', () => {
      normalizeUserConfig({
        mode: 'lite',
      });

      expect(
        consoleOutput.some((output) =>
          output.includes(
            "The 'mode' configuration will be deprecated in a future version. Please use 'output.mode' instead.",
          ),
        ),
      ).toBe(true);
    });

    it('should show warning when using deprecated compressData configuration', () => {
      normalizeUserConfig({
        output: {
          compressData: false,
        },
      });

      expect(
        consoleOutput.some((output) =>
          output.includes(
            "The 'compressData' configuration will be deprecated in a future version.",
          ),
        ),
      ).toBe(true);
    });

    it('should not show compressData warning when compressData is undefined', () => {
      normalizeUserConfig({
        output: {
          compressData: undefined,
        },
      });

      expect(
        consoleOutput.some((output) =>
          output.includes(
            "The 'compressData' configuration will be deprecated in a future version.",
          ),
        ),
      ).toBe(false);
    });

    it('should not show warning when using output.mode instead of mode', () => {
      normalizeUserConfig({
        output: {
          mode: 'brief',
        },
      });

      expect(
        consoleOutput.some((output) =>
          output.includes(
            "The 'mode' configuration will be deprecated in a future version. Please use 'output.mode' instead.",
          ),
        ),
      ).toBe(false);
    });

    it('should handle invalid mode values gracefully', () => {
      const result = normalizeUserConfig({
        output: {
          mode: 'invalid' as any,
        },
      });

      // Should fall back to default mode
      expect(result.output.mode).toBe('normal');
    });

    it('should show warning when lite features are enabled', () => {
      normalizeUserConfig({
        features: {
          lite: true,
        },
      });

      expect(
        consoleOutput.some((output) =>
          output.includes(
            "Lite features will be deprecated in a future version. Please use 'output: { reportCodeType: { noAssetsAndModuleSource: true }}' instead.",
          ),
        ),
      ).toBe(true);
    });

    it('should show both warnings when both mode and lite features are used', () => {
      normalizeUserConfig({
        mode: 'lite',
        features: {
          lite: true,
        },
      });

      const modeWarning = consoleOutput.some((output) =>
        output.includes(
          "The 'mode' configuration will be deprecated in a future version. Please use 'output.mode' instead.",
        ),
      );
      const liteWarning = consoleOutput.some((output) =>
        output.includes(
          "Lite features will be deprecated in a future version. Please use 'output: { reportCodeType: { noAssetsAndModuleSource: true }}' instead.",
        ),
      );

      expect(modeWarning).toBe(true);
      expect(liteWarning).toBe(true);
    });
  });

  describe('mode priority', () => {
    it('should prioritize output.mode over mode', () => {
      const result = normalizeUserConfig({
        mode: 'normal',
        output: {
          mode: 'brief',
        },
      });

      expect(result.output.mode).toBe('brief');
    });

    it('should use mode when output.mode is not provided', () => {
      const result = normalizeUserConfig({
        mode: 'brief',
      });

      expect(result.output.mode).toBe('brief');
    });

    it('should handle output.mode with invalid value and fall back to mode', () => {
      const result = normalizeUserConfig({
        mode: 'brief',
        output: {
          mode: 'invalid' as any,
        },
      });

      expect(result.output.mode).toBe('brief');
    });

    it('should use normal as default when neither mode nor output.mode is provided', () => {
      const result = normalizeUserConfig({});

      expect(result.output.mode).toBe('normal');
    });

    it('should set mode to lite when lite features are enabled and mode is not brief', () => {
      const result = normalizeUserConfig({
        features: {
          lite: true,
        },
      });

      expect(result.output.mode).toBe('lite');
    });

    it('should not change mode to lite when in brief mode', () => {
      const result = normalizeUserConfig({
        output: {
          mode: 'brief',
        },
        features: {
          lite: true,
        },
      });

      expect(result.output.mode).toBe('brief');
    });
  });

  describe('output.reportCodeType', () => {
    it('should return NoCode when mode is brief regardless of reportCodeType', () => {
      const result = normalizeUserConfig({
        mode: 'brief',
        output: {
          reportCodeType: {
            noModuleSource: true,
            noAssetsAndModuleSource: false,
            noCode: false,
          },
        },
      });
      expect(result.output.reportCodeType).toBe(SDK.ToDataType.NoCode);
    });

    it('should return NoSourceAndAssets when mode is lite and no special flags', () => {
      const result = normalizeUserConfig({
        mode: 'lite',
        output: {
          reportCodeType: {
            noModuleSource: false,
            noAssetsAndModuleSource: false,
            noCode: false,
          },
        },
      });
      expect(result.output.reportCodeType).toBe(
        SDK.ToDataType.NoSourceAndAssets,
      );
    });

    it('should return NoSource when mode is lite and no special flags', () => {
      const result = normalizeUserConfig({
        mode: 'lite',
        output: {
          reportCodeType: {
            noModuleSource: false,
            noAssetsAndModuleSource: false,
            noCode: false,
          },
        },
      });
      expect(result.output.reportCodeType).toBe(
        SDK.ToDataType.NoSourceAndAssets,
      );
    });

    it('should return NoSourceAndAssets when mode is lite and noAssetsAndModuleSource is true', () => {
      const result = normalizeUserConfig({
        mode: 'lite',
        output: {
          reportCodeType: {
            noModuleSource: false,
            noAssetsAndModuleSource: true,
            noCode: false,
          },
        },
      });
      expect(result.output.reportCodeType).toBe(
        SDK.ToDataType.NoSourceAndAssets,
      );
    });

    it('should respect noCode flag in normal mode', () => {
      const result = normalizeUserConfig({
        mode: 'normal',
        output: {
          reportCodeType: {
            noModuleSource: false,
            noAssetsAndModuleSource: false,
            noCode: true,
          },
        },
      });
      expect(result.output.reportCodeType).toBe(SDK.ToDataType.NoCode);
    });

    it('should respect noAssetsAndModuleSource flag in normal mode', () => {
      const result = normalizeUserConfig({
        mode: 'normal',
        output: {
          reportCodeType: {
            noModuleSource: false,
            noAssetsAndModuleSource: true,
            noCode: false,
          },
        },
      });
      expect(result.output.reportCodeType).toBe(
        SDK.ToDataType.NoSourceAndAssets,
      );
    });

    it('should respect noModuleSource flag in normal mode', () => {
      const result = normalizeUserConfig({
        mode: 'normal',
        output: {
          reportCodeType: {
            noModuleSource: true,
            noAssetsAndModuleSource: false,
            noCode: false,
          },
        },
      });
      expect(result.output.reportCodeType).toBe(SDK.ToDataType.NoSource);
    });

    it('should return Normal when no flags are set in normal mode', () => {
      const result = normalizeUserConfig({
        mode: 'normal',
        output: {
          reportCodeType: {
            noModuleSource: false,
            noAssetsAndModuleSource: false,
            noCode: false,
          },
        },
      });
      expect(result.output.reportCodeType).toBe(SDK.ToDataType.Normal);
    });

    it('should handle NewReportCodeType string values - noCode', () => {
      const result = normalizeUserConfig({
        mode: 'normal',
        output: {
          reportCodeType: 'noCode',
        },
      });
      expect(result.output.reportCodeType).toBe(SDK.ToDataType.NoCode);
    });

    it('should handle NewReportCodeType string values - noAssetsAndModuleSource', () => {
      const result = normalizeUserConfig({
        mode: 'normal',
        output: {
          reportCodeType: 'noAssetsAndModuleSource',
        },
      });
      expect(result.output.reportCodeType).toBe(
        SDK.ToDataType.NoSourceAndAssets,
      );
    });

    it('should handle NewReportCodeType string values - noModuleSource', () => {
      const result = normalizeUserConfig({
        mode: 'normal',
        output: {
          reportCodeType: 'noModuleSource',
        },
      });
      expect(result.output.reportCodeType).toBe(SDK.ToDataType.NoSource);
    });

    it('should handle undefined reportCodeType and use default', () => {
      const result = normalizeUserConfig({
        mode: 'normal',
        output: {
          reportCodeType: undefined,
        },
      });
      expect(result.output.reportCodeType).toBe(SDK.ToDataType.Normal);
    });

    it('should handle empty object reportCodeType and use default', () => {
      const result = normalizeUserConfig({
        mode: 'normal',
        output: {
          reportCodeType: {},
        },
      });
      expect(result.output.reportCodeType).toBe(SDK.ToDataType.Normal);
    });

    it('should prioritize noCode over other flags in normal mode', () => {
      const result = normalizeUserConfig({
        mode: 'normal',
        output: {
          reportCodeType: {
            noCode: true,
            noModuleSource: true,
            noAssetsAndModuleSource: true,
          },
        },
      });
      expect(result.output.reportCodeType).toBe(SDK.ToDataType.NoCode);
    });

    it('should prioritize noAssetsAndModuleSource over noModuleSource in normal mode', () => {
      const result = normalizeUserConfig({
        mode: 'normal',
        output: {
          reportCodeType: {
            noCode: false,
            noModuleSource: true,
            noAssetsAndModuleSource: true,
          },
        },
      });
      expect(result.output.reportCodeType).toBe(
        SDK.ToDataType.NoSourceAndAssets,
      );
    });

    it('should handle brief mode with valid NewReportCodeType string', () => {
      const result = normalizeUserConfig({
        output: {
          mode: 'brief',
          reportCodeType: 'noCode',
        },
      });
      expect(result.output.reportCodeType).toBe(SDK.ToDataType.NoCode);
    });

    it('should handle lite mode via features with NewReportCodeType string', () => {
      const result = normalizeUserConfig({
        features: {
          lite: true,
        },
        output: {
          reportCodeType: 'noCode',
        },
      });
      expect(result.output.reportCodeType).toBe(SDK.ToDataType.NoCode);
    });
  });

  describe('disableClientServer with CI environment variable', () => {
    it('should set disableClientServer to true when process.env.CI is set', () => {
      process.env.CI = 'true';
      const result = normalizeUserConfig();
      expect(result.disableClientServer).toBe(true);
    });

    it('should set disableClientServer to true when process.env.CI is set to any value', () => {
      process.env.CI = '1';
      const result = normalizeUserConfig();
      expect(result.disableClientServer).toBe(true);
    });

    it('should set disableClientServer to true when process.env.CI is set to empty string', () => {
      process.env.CI = '';
      const result = normalizeUserConfig();
      // Empty string is falsy, so it should use default
      expect(result.disableClientServer).toBe(false);
    });

    it('should set disableClientServer to true when process.env.CI is set to non-empty string', () => {
      process.env.CI = 'ci';
      const result = normalizeUserConfig({
        disableClientServer: false,
      });
      expect(result.disableClientServer).toBe(true);
    });
  });
});
