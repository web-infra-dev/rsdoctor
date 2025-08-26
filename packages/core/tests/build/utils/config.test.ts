import { describe, expect, it, beforeEach, afterEach } from '@rstest/core';
import { normalizeUserConfig } from '../../../src/inner-plugins/utils/config';
import { SDK } from '@rsdoctor/types';

// Mock console.log to capture warning messages
const originalConsoleLog = console.log;
let consoleOutput: string[] = [];

beforeEach(() => {
  consoleOutput = [];
  console.log = (...args: any[]) => {
    consoleOutput.push(args.join(' '));
  };
});

afterEach(() => {
  console.log = originalConsoleLog;
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
    expect(result.output.compressData).toBe(true);
    expect(result.output.mode).toBe('normal');
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
            "[RSDOCTOR]: The 'mode' configuration will be deprecated in a future version. Please use 'output.mode' instead.",
          ),
        ),
      ).toBe(true);
    });

    it('should not show warning when using output.mode instead of mode', () => {
      normalizeUserConfig({
        output: {
          mode: 'lite',
        },
      });

      expect(
        consoleOutput.some((output) =>
          output.includes(
            "[RSDOCTOR]: The 'mode' configuration will be deprecated in a future version. Please use 'output.mode' instead.",
          ),
        ),
      ).toBe(false);
    });

    it('should show warning when lite mode is enabled', () => {
      normalizeUserConfig({
        output: {
          mode: 'lite',
        },
      });

      expect(
        consoleOutput.some((output) =>
          output.includes(
            "[RSDOCTOR]: lite features will be deprecated in a future version. Please use 'output: { reportCodeType: { noAssetsAndModuleSource: true }}' instead.",
          ),
        ),
      ).toBe(true);
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
            "[RSDOCTOR]: lite features will be deprecated in a future version. Please use 'output: { reportCodeType: { noAssetsAndModuleSource: true }}' instead.",
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
          "[RSDOCTOR]: The 'mode' configuration will be deprecated in a future version. Please use 'output.mode' instead.",
        ),
      );
      const liteWarning = consoleOutput.some((output) =>
        output.includes(
          "[RSDOCTOR]: lite features will be deprecated in a future version. Please use 'output: { reportCodeType: { noAssetsAndModuleSource: true }}' instead.",
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
          mode: 'lite',
        },
      });

      expect(result.output.mode).toBe('lite');
    });

    it('should use mode when output.mode is not provided', () => {
      const result = normalizeUserConfig({
        mode: 'lite',
      });

      expect(result.output.mode).toBe('lite');
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
  });
});
