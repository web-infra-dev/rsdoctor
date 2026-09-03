import { describe, expect, it, beforeEach, afterEach } from 'rstack/test';
import { normalizeUserConfig } from '../../../src/inner-plugins/utils/config';
import { SDK } from '@rsdoctor/shared/types';

// Mock console output to capture log messages
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
let consoleOutput: string[] = [];
let consoleWarningOutput: string[] = [];
const originalEnvCI = process.env.CI;
const originalEnvRSTEST = process.env.RSTEST;
const originalEnvRSDOCTOROUTPUT = process.env.RSDOCTOR_OUTPUT;

beforeEach(() => {
  consoleOutput = [];
  consoleWarningOutput = [];
  console.log = (...args: any[]) => {
    consoleOutput.push(args.join(' '));
  };
  console.warn = (...args: any[]) => {
    consoleWarningOutput.push(args.join(' '));
  };
  delete process.env.CI;
  delete process.env.RSTEST;
  delete process.env.RSDOCTOR_OUTPUT;
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
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
    const removedModeWarning = (replacement: string) =>
      `The top-level 'mode' configuration was removed in Rsdoctor 2.x and is ignored. Please use '${replacement}' instead.`;

    it('should show a warning for the removed top-level mode', () => {
      normalizeUserConfig({ mode: 'brief' } as never);

      expect(
        consoleOutput.some((output) =>
          output.includes(removedModeWarning('output.mode')),
        ),
      ).toBe(true);
    });

    it("should recommend output.reportCodeType for mode: 'lite'", () => {
      normalizeUserConfig({ mode: 'lite' } as never);

      expect(
        consoleOutput.some((output) =>
          output.includes(removedModeWarning('output.reportCodeType')),
        ),
      ).toBe(true);
    });

    it.each(['', null, false, 0])(
      'should show the top-level mode warning for %p',
      (mode) => {
        normalizeUserConfig({ mode } as never);

        expect(
          consoleOutput.some((output) =>
            output.includes(removedModeWarning('output.mode')),
          ),
        ).toBe(true);
      },
    );

    it('should not show the top-level mode warning for undefined', () => {
      normalizeUserConfig({ mode: undefined } as never);

      expect(
        consoleOutput.some((output) =>
          output.includes("The top-level 'mode' configuration was removed"),
        ),
      ).toBe(false);
    });

    it('should not show the top-level mode warning for output.mode', () => {
      normalizeUserConfig({ output: { mode: 'brief' } });

      expect(
        consoleOutput.some((output) =>
          output.includes(removedModeWarning('output.mode')),
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

    it('should not show a deprecation warning when lite features are enabled', () => {
      normalizeUserConfig({
        features: {
          lite: true,
        },
      });
      normalizeUserConfig({
        features: ['lite'],
      });

      expect(consoleOutput).toEqual([]);
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
    it('should preserve server.port', () => {
      const result = normalizeUserConfig({
        server: {
          port: 9876,
        },
      });

      expect(result.server.port).toBe(9876);
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
    it('should handle noCode', () => {
      const result = normalizeUserConfig({
        output: {
          mode: 'normal',
          reportCodeType: 'noCode',
        },
      });
      expect(result.output.reportCodeType).toBe(SDK.ToDataType.NoCode);
    });

    it('should handle noAssetsAndModuleSource', () => {
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

    it('should handle noModuleSource', () => {
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

    it('should handle brief mode with noCode', () => {
      const result = normalizeUserConfig({
        output: {
          mode: 'brief',
          reportCodeType: 'noCode',
        },
      });
      expect(result.output.reportCodeType).toBe(SDK.ToDataType.NoCode);
    });

    it.each(['noModuleSource', 'noAssetsAndModuleSource'] as const)(
      'should warn and use NoCode for %s in brief mode',
      (reportCodeType) => {
        const result = normalizeUserConfig({
          output: {
            mode: 'brief',
            reportCodeType,
          },
        } as never);

        expect(result.output.reportCodeType).toBe(SDK.ToDataType.NoCode);
        expect(
          consoleWarningOutput.some((output) =>
            output.includes(
              '`output.reportCodeType` is ignored when `output.mode` is "brief"',
            ),
          ),
        ).toBe(true);
      },
    );

    it('should handle lite mode via features', () => {
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

    it('should reject the legacy object value', () => {
      expect(() =>
        normalizeUserConfig({
          output: {
            mode: 'normal',
            reportCodeType: { noCode: true },
          },
        } as never),
      ).toThrow('`output.reportCodeType` must be');
    });

    it('should reject an unknown string value', () => {
      expect(() =>
        normalizeUserConfig({
          output: {
            mode: 'normal',
            reportCodeType: 'unknown',
          },
        } as never),
      ).toThrow('`output.reportCodeType` must be');
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
