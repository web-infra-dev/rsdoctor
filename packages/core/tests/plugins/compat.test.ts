import {
  migrateRsdoctorOptions,
  type CompatibleRsdoctorOptions,
} from '@/compat';
import { normalizeUserConfig } from '@/inner-plugins/utils/config';
import { logger } from '@/logger';
import { SDK } from '@rsdoctor/shared/types';
import { afterEach, beforeEach, describe, expect, it, rs } from 'rstack/test';

describe('framework options compatibility', () => {
  beforeEach(() => {
    rs.spyOn(logger, 'warn').mockImplementation(() => {});
    rs.spyOn(logger, 'info').mockImplementation(() => {});
    rs.stubEnv('RSDOCTOR_OUTPUT', '');
  });
  afterEach(() => {
    rs.restoreAllMocks();
    rs.unstubAllEnvs();
  });

  it('migrates legacy options through the current normalizer without duplicate logs', () => {
    const migrated = migrateRsdoctorOptions({
      port: 0,
      mode: 'brief',
      brief: { reportHtmlName: 'legacy.html', writeDataJson: true },
      supports: { generateTileGraph: false, gzip: false },
      experiments: { enableNativePlugin: false },
    });
    const normalized = normalizeUserConfig(migrated);
    expect(normalized.server.port).toBe(0);
    expect(normalized.output.mode).toBe('brief');
    expect(normalized.output.options).toMatchObject({
      type: ['html', 'json'],
      htmlOptions: { reportHtmlName: 'legacy.html' },
    });
    expect(normalized.supports.gzip).toBe(false);
    expect(migrated).not.toHaveProperty('experiments');
    expect(migrated.supports).not.toHaveProperty('generateTileGraph');
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('port → server.port'),
    );
    expect(logger.info).not.toHaveBeenCalled();
    expect(migrateRsdoctorOptions(migrated)).toEqual(migrated);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('keeps the legacy default mode when brief is configured without mode', () => {
    const migrated = migrateRsdoctorOptions({
      brief: { reportHtmlName: 'legacy.html', writeDataJson: true },
    });

    expect(migrated).toEqual({});
    expect(normalizeUserConfig(migrated).output.mode).toBe('normal');
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('brief → output.options.htmlOptions'),
    );
  });

  it.each([
    [{ noModuleSource: true }, SDK.ToDataType.NoSource],
    [
      { noAssetsAndModuleSource: true, noModuleSource: true },
      SDK.ToDataType.NoSourceAndAssets,
    ],
    [{ noCode: true, noAssetsAndModuleSource: true }, SDK.ToDataType.NoCode],
    [{ noCode: false }, SDK.ToDataType.Normal],
  ] as const)(
    'converts reportCodeType %j with legacy priority',
    (reportCodeType, expected) => {
      const normalized = normalizeUserConfig(
        migrateRsdoctorOptions({ output: { reportCodeType } }),
      );
      expect(normalized.output.reportCodeType).toBe(expected);
    },
  );

  it('migrates lite mode while respecting explicit output configuration', () => {
    expect(
      normalizeUserConfig(migrateRsdoctorOptions({ mode: 'lite' })).output
        .reportCodeType,
    ).toBe(SDK.ToDataType.NoSourceAndAssets);
    expect(
      normalizeUserConfig(
        migrateRsdoctorOptions({ mode: 'lite', output: { mode: 'normal' } }),
      ).output.reportCodeType,
    ).toBe(SDK.ToDataType.Normal);
    expect(
      normalizeUserConfig(
        migrateRsdoctorOptions({
          mode: 'lite',
          output: { reportCodeType: 'noCode' },
        }),
      ).output.reportCodeType,
    ).toBe(SDK.ToDataType.NoCode);
  });

  it('preserves explicit current fields, including false and empty arrays', () => {
    const migrated = migrateRsdoctorOptions({
      mode: 'normal',
      port: 8080,
      server: { port: 0 },
      brief: { reportHtmlName: 'old.html', writeDataJson: true },
      output: {
        mode: 'brief',
        compressData: true,
        options: {
          type: [],
          htmlOptions: { reportHtmlName: 'new.html', writeDataJson: false },
        },
      },
    });
    expect(migrated.server?.port).toBe(0);
    expect(migrated.output).toMatchObject({
      mode: 'brief',
      options: { type: [], htmlOptions: { reportHtmlName: 'new.html' } },
    });
    const withoutType = migrateRsdoctorOptions({
      mode: 'brief',
      brief: { writeDataJson: true },
      output: { options: { htmlOptions: { writeDataJson: false } } },
    });
    expect(withoutType.output?.options?.type).toEqual(['html']);
  });

  it('migrates compressData only when enabled and keeps explicit output mode', () => {
    expect(
      migrateRsdoctorOptions({ output: { compressData: true } }).output,
    ).toMatchObject({ mode: 'brief', options: { type: ['json'] } });
    expect(
      normalizeUserConfig(
        migrateRsdoctorOptions({ output: { compressData: false } }),
      ).output.mode,
    ).toBe('normal');
    expect(
      normalizeUserConfig(
        migrateRsdoctorOptions({
          output: { mode: 'normal', compressData: true },
        }),
      ).output.mode,
    ).toBe('normal');
  });

  it('does not mutate framework configuration', () => {
    const config: CompatibleRsdoctorOptions = {
      mode: 'brief',
      brief: Object.freeze({ reportHtmlName: 'old.html' }),
      output: Object.freeze({
        options: Object.freeze({
          htmlOptions: Object.freeze({ writeDataJson: true }),
        }),
      }),
      supports: Object.freeze({ generateTileGraph: true }),
    };
    const original = structuredClone(config);
    migrateRsdoctorOptions(Object.freeze(config));
    expect(config).toEqual(original);
  });

  it.each([{}, { enableNativePlugin: undefined }])(
    'does not warn for experiments without a legacy value: %j',
    (experiments) => {
      expect(migrateRsdoctorOptions({ experiments })).toEqual({});
      expect(logger.warn).not.toHaveBeenCalled();
    },
  );

  it.each([true, false])(
    'warns for enableNativePlugin: %s',
    (enableNativePlugin) => {
      migrateRsdoctorOptions({ experiments: { enableNativePlugin } });
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('experiments.enableNativePlugin'),
      );
    },
  );

  it.each(['normal', 'brief', 'lite'] as const)(
    'treats null reportCodeType as unspecified in %s mode',
    (mode) => {
      const config = {
        mode,
        output: { reportCodeType: null },
      } as unknown as CompatibleRsdoctorOptions;
      expect(normalizeUserConfig(migrateRsdoctorOptions(config))).toEqual(
        normalizeUserConfig(migrateRsdoctorOptions({ mode })),
      );
      expect(logger.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('output.reportCodeType (object)'),
      );
    },
  );

  it.each([[], new Date(0)])(
    'rejects non-record reportCodeType: %j',
    (reportCodeType) => {
      const config = {
        output: { reportCodeType },
      } as unknown as CompatibleRsdoctorOptions;
      expect(() => migrateRsdoctorOptions(config)).toThrow(
        '`output.reportCodeType` must be a string or a plain object of legacy flags.',
      );
      expect(logger.warn).not.toHaveBeenCalled();
    },
  );

  it('accepts current options without warnings', () => {
    expect(migrateRsdoctorOptions()).toEqual({});
    const config = {
      output: {
        mode: 'brief',
        options: { type: ['json'], jsonOptions: { fileName: 'report.json' } },
      },
    } satisfies CompatibleRsdoctorOptions;
    expect(normalizeUserConfig(migrateRsdoctorOptions(config))).toEqual(
      normalizeUserConfig(config),
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('leaves the output environment override to the current normalizer', () => {
    rs.stubEnv('RSDOCTOR_OUTPUT', 'json');
    const normalized = normalizeUserConfig(
      migrateRsdoctorOptions({
        mode: 'lite',
        output: { reportDir: 'reports' },
      }),
    );
    expect(normalized.output).toMatchObject({
      mode: 'brief',
      reportDir: 'reports',
      options: { type: ['json'] },
    });
  });
});
