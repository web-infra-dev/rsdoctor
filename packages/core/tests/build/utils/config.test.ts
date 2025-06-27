import { describe, expect, it, vi } from 'vitest';
import { normalizeUserConfig } from '../../../src/inner-plugins/utils/config';
import { SDK } from '@rsdoctor/types';

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
    expect(result.mode).toBe('normal');
  });

  it('should respect custom features array', () => {
    const result = normalizeUserConfig({
      features: ['loader', 'plugins', 'lite'],
    });
    expect(result.features.loader).toBe(true);
    expect(result.features.plugins).toBe(true);
    expect(result.features.lite).toBe(true);
    expect(result.features.resolver).toBe(false);
    expect(result.output.reportCodeType).toBe(SDK.ToDataType.NoSource);
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

  it('should use default supports when not provided', () => {
    const result = normalizeUserConfig();
    expect(result.supports.banner).toEqual(undefined);
    expect(result.supports.generateTileGraph).toEqual(undefined);
    expect(result.supports.gzip).toEqual(false);
    expect(result.supports.parseBundle).toEqual(true);
  });

  it('should respect custom supports', () => {
    const customSupports = {
      parseBundle: false,
      banner: true,
      generateTileGraph: false,
      gzip: true,
    };
    const result = normalizeUserConfig({ supports: customSupports });
    expect(result.supports).toEqual(customSupports);
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
      expect(result.output.reportCodeType).toBe(SDK.ToDataType.NoSource);
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
