import { describe, expect, it, beforeEach, afterEach } from '@rstest/core';
import { normalizeUserConfig } from '../../../src/inner-plugins/utils/config';
import { SDK } from '@rsdoctor/shared/types';

// Mock console.log to capture warning messages
const originalConsoleLog = console.log;
let consoleOutput: string[] = [];
const originalEnvCI = process.env.CI;
const originalEnvRSTEST = process.env.RSTEST;
const originalEnvRSDOCTOROUTPUT = process.env.RSDOCTOR_OUTPUT;

beforeEach(() => {
  consoleOutput = [];
  console.log = (...args: any[]) => {
    consoleOutput.push(args.join(' '));
  };
  delete process.env.CI;
  delete process.env.RSTEST;
  delete process.env.RSDOCTOR_OUTPUT;
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
  if (originalEnvRSDOCTOROUTPUT !== undefined) {
    process.env.RSDOCTOR_OUTPUT = originalEnvRSDOCTOROUTPUT;
  } else {
    delete process.env.RSDOCTOR_OUTPUT;
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
    expect(result.multiCompiler).toEqual({
      enabled: true,
      group: undefined,
    });
  });

  it('should normalize multi-compiler configuration', () => {
    expect(normalizeUserConfig({ multiCompiler: false }).multiCompiler).toEqual(
      {
        enabled: false,
        group: undefined,
      },
    );
    expect(
      normalizeUserConfig({ multiCompiler: { group: 'ssr' } }).multiCompiler,
    ).toEqual({ enabled: true, group: 'ssr' });
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
      features: ['loader', 'plugins', 'treeShaking', 'lite'],
    });
    expect(result.features.loader).toBe(true);
    expect(result.features.plugins).toBe(true);
    expect(result.features.treeShaking).toBe(true);
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
    expect(result.features.treeShaking).toBe(false);
    expect(result.features.lite).toBe(true);
  });

  it('should normalize output.reportCodeType according to mode', () => {
    const result = normalizeUserConfig({
      output: { mode: 'brief', reportCodeType: { noCode: true } },
    });
    expect(result.output.reportCodeType).toBe(SDK.ToDataType.NoCode);
  });

  it('should normalize output.reportCodeType with lite features', () => {
    const result = normalizeUserConfig({
      features: { lite: true },
      output: { reportCodeType: { noCode: true } },
    });
    expect(result.output.reportCodeType).toBe(SDK.ToDataType.NoCode);
  });

  it('should use default supports when not provided', () => {
    const result = normalizeUserConfig();
    expect(result.supports.gzip).toEqual({ gzipLevel: 6 });
    expect(result.supports.parseBundle).toEqual(true);
  });

  it('should normalize enabled gzip support with the default level', () => {
    const result = normalizeUserConfig({
      supports: {
        gzip: true,
      },
    });
    expect(result.supports.gzip).toEqual({ gzipLevel: 6 });
  });

  it('should normalize an empty gzip config with the default level', () => {
    const result = normalizeUserConfig({
      supports: {
        gzip: {},
      },
    });
    expect(result.supports.gzip).toEqual({ gzipLevel: 6 });
  });

  it('should respect disabled gzip support', () => {
    const result = normalizeUserConfig({
      supports: {
        gzip: false,
      },
    });
    expect(result.supports.gzip).toBe(false);
  });

  it('should respect other custom supports', () => {
    const result = normalizeUserConfig({
      supports: {
        gzip: {
          gzipLevel: 6,
        },
        parseBundle: false,
      },
    });
    expect(result.supports).toEqual({
      parseBundle: false,
      gzip: { gzipLevel: 6 },
    });
  });

  it.each([0, 6, 9])('should respect gzip level %s', (gzipLevel) => {
    expect(
      normalizeUserConfig({
        supports: {
          gzip: { gzipLevel },
        },
      }).supports.gzip,
    ).toEqual({ gzipLevel });
  });

  it.each([-1, 1.5, 10, Number.NaN, null])(
    'should reject invalid gzip level %s',
    (gzipLevel) => {
      expect(() =>
        normalizeUserConfig({
          supports: {
            gzip: { gzipLevel } as never,
          },
        }),
      ).toThrow(
        '`supports.gzip.gzipLevel` must be an integer between 0 and 9.',
      );
    },
  );

  it.each([[null], [1], ['true'], [[]]])(
    'should reject invalid gzip support %s',
    (gzip) => {
      expect(() =>
        normalizeUserConfig({
          supports: {
            gzip: gzip as never,
          },
        }),
      ).toThrow('`supports.gzip` must be a boolean or an object.');
    },
  );

  describe('deprecated configuration warnings', () => {
    it('should show a warning for the removed top-level mode', () => {
      normalizeUserConfig({ mode: 'brief' } as never);

      expect(
        consoleOutput.some((output) =>
          output.includes(
            "The top-level 'mode' configuration was removed in Rsdoctor 2.x and is ignored. Please use 'output.mode' instead.",
          ),
        ),
      ).toBe(true);
    });

    it('should not show the top-level mode warning for output.mode', () => {
      normalizeUserConfig({ output: { mode: 'brief' } });

      expect(
        consoleOutput.some((output) =>
          output.includes(
            "The top-level 'mode' configuration was removed in Rsdoctor 2.x and is ignored. Please use 'output.mode' instead.",
          ),
        ),
      ).toBe(false);
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
            "The 'compressData' configuration is deprecated in Rsdoctor 2.x.",
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
            "The 'compressData' configuration is deprecated in Rsdoctor 2.x.",
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
            "Lite features are deprecated in Rsdoctor 2.x. Please use 'output: { reportCodeType: { noAssetsAndModuleSource: true }}' instead.",
          ),
        ),
      ).toBe(true);
    });
  });

  describe('output mode', () => {
    it('should use brief json output when RSDOCTOR_OUTPUT is json', () => {
      process.env.RSDOCTOR_OUTPUT = 'json';

      const result = normalizeUserConfig();

      expect(result.output.mode).toBe('brief');
      expect(result.output.options).toEqual({
        type: ['json'],
        htmlOptions: {
          reportHtmlName: undefined,
        },
        jsonOptions: {
          fileName: 'rsdoctor-data.json',
          sections: {
            moduleGraph: true,
            chunkGraph: true,
            rules: true,
          },
        },
      });
    });

    it('should ignore the removed top-level mode', () => {
      const result = normalizeUserConfig({ mode: 'brief' } as never);

      expect(result.output.mode).toBe('normal');
    });

    it('should use normal as default when output.mode is not provided', () => {
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

  describe('server configuration', () => {
    it('should preserve port and apply it to server.port', () => {
      const result = normalizeUserConfig({
        port: 9876,
      });

      expect(result.port).toBe(9876);
      expect(result.server.port).toBe(9876);
    });

    it('should preserve server.port', () => {
      const result = normalizeUserConfig({
        server: {
          port: 9876,
        },
      });

      expect(result.server.port).toBe(9876);
    });

    it('should prefer server.port over port', () => {
      const result = normalizeUserConfig({
        port: 9876,
        server: {
          port: 9877,
        },
      });

      expect(result.port).toBe(9876);
      expect(result.server.port).toBe(9877);
    });

    it('should preserve server.cors options', () => {
      const result = normalizeUserConfig({
        server: {
          cors: {
            origin: 'https://example.com',
            credentials: true,
          },
        },
      });

      expect(result.server.cors).toEqual({
        origin: 'https://example.com',
        credentials: true,
      });
    });

    it('should preserve server.cors boolean values', () => {
      expect(
        normalizeUserConfig({
          server: {
            cors: false,
          },
        }).server.cors,
      ).toBe(false);

      expect(
        normalizeUserConfig({
          server: {
            cors: true,
          },
        }).server.cors,
      ).toBe(true);
    });
  });

  describe('output.reportCodeType', () => {
    it('should return NoCode when mode is brief regardless of reportCodeType', () => {
      const result = normalizeUserConfig({
        output: {
          mode: 'brief',
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
        features: { lite: true },
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
        features: { lite: true },
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
        output: {
          mode: 'normal',
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
        output: {
          mode: 'normal',
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
        output: {
          mode: 'normal',
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
        output: {
          mode: 'normal',
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
        output: {
          mode: 'normal',
          reportCodeType: 'noCode',
        },
      });
      expect(result.output.reportCodeType).toBe(SDK.ToDataType.NoCode);
    });

    it('should handle NewReportCodeType string values - noAssetsAndModuleSource', () => {
      const result = normalizeUserConfig({
        output: {
          mode: 'normal',
          reportCodeType: 'noAssetsAndModuleSource',
        },
      });
      expect(result.output.reportCodeType).toBe(
        SDK.ToDataType.NoSourceAndAssets,
      );
    });

    it('should handle NewReportCodeType string values - noModuleSource', () => {
      const result = normalizeUserConfig({
        output: {
          mode: 'normal',
          reportCodeType: 'noModuleSource',
        },
      });
      expect(result.output.reportCodeType).toBe(SDK.ToDataType.NoSource);
    });

    it('should handle undefined reportCodeType and use default', () => {
      const result = normalizeUserConfig({
        output: {
          mode: 'normal',
          reportCodeType: undefined,
        },
      });
      expect(result.output.reportCodeType).toBe(SDK.ToDataType.Normal);
    });

    it('should handle empty object reportCodeType and use default', () => {
      const result = normalizeUserConfig({
        output: {
          mode: 'normal',
          reportCodeType: {},
        },
      });
      expect(result.output.reportCodeType).toBe(SDK.ToDataType.Normal);
    });

    it('should prioritize noCode over other flags in normal mode', () => {
      const result = normalizeUserConfig({
        output: {
          mode: 'normal',
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
        output: {
          mode: 'normal',
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
