import type { Config, Linter, Plugin } from '@rsdoctor/shared/types';
import { logger } from './logger';

type LegacyBriefConfig = Config.BriefConfig & { writeDataJson?: boolean };

/** Options accepted by framework integrations migrating from Rsdoctor 1.x. */
export type CompatibleRsdoctorOptions<
  Rules extends Linter.ExtendRuleData[] = [],
> = Omit<Plugin.RsdoctorRspackPluginOptions<Rules>, 'output' | 'supports'> & {
  mode?: 'normal' | 'brief' | 'lite';
  port?: number;
  brief?: LegacyBriefConfig;
  experiments?: {
    enableNativePlugin?:
      boolean | { moduleGraph?: boolean; chunkGraph?: boolean };
  };
  supports?: Plugin.RsdoctorRspackPluginOptions<Rules>['supports'] & {
    generateTileGraph?: boolean;
  };
  output?: {
    mode?: 'normal' | 'brief';
    reportDir?: string;
    reportCodeType?:
      | Config.NewReportCodeType
      | Partial<Record<Config.NewReportCodeType, boolean>>;
    compressData?: boolean;
    options?: Omit<Config.BriefModeOptions, 'htmlOptions'> & {
      htmlOptions?: LegacyBriefConfig;
    };
  };
};

/**
 * Translate legacy options before constructing the plugin. Explicit current
 * options take precedence. The input is never mutated; only legacy fields log.
 */
export function migrateRsdoctorOptions<
  Rules extends Linter.ExtendRuleData[] = [],
>(
  config: CompatibleRsdoctorOptions<Rules> = {},
): Plugin.RsdoctorRspackPluginOptions<Rules> {
  const { mode, port, brief, output, supports, experiments, ...rest } = config;
  const migrations: string[] = [];
  const migrate = (value: unknown, from: string, to: string) => {
    if (value !== undefined) migrations.push(`${from} → ${to}`);
  };
  const result: Plugin.RsdoctorRspackPluginOptions<Rules> = { ...rest };

  migrate(
    experiments,
    'experiments.enableNativePlugin',
    'remove (the native plugin is always enabled)',
  );

  migrate(port, 'port', 'server.port');
  if (port !== undefined) {
    result.server = { ...config.server, port: config.server?.port ?? port };
  }
  if (supports) {
    const { generateTileGraph, ...currentSupports } = supports;
    migrate(
      generateTileGraph,
      'supports.generateTileGraph',
      'remove (treemap is always supported)',
    );
    result.supports = currentSupports;
  }

  migrate(
    mode,
    'mode',
    mode === 'lite' ? 'output.reportCodeType' : 'output.mode',
  );
  migrate(brief, 'brief', 'output.options.htmlOptions');
  migrate(
    output?.compressData,
    'output.compressData',
    "output.mode: 'brief', output.options.type: ['json']",
  );
  migrate(
    brief?.writeDataJson,
    'brief.writeDataJson',
    "output.options.type: ['html', 'json']",
  );
  migrate(
    output?.options?.htmlOptions?.writeDataJson,
    'output.options.htmlOptions.writeDataJson',
    "output.options.type: ['html', 'json']",
  );

  if (output || mode !== undefined || brief !== undefined) {
    const { compressData, reportCodeType, options, ...currentOutput } =
      output ?? {};
    let codeType =
      typeof reportCodeType === 'object'
        ? (
            ['noCode', 'noAssetsAndModuleSource', 'noModuleSource'] as const
          ).find((key) => reportCodeType[key])
        : reportCodeType;
    if (typeof reportCodeType === 'object') {
      migrate(
        reportCodeType,
        'output.reportCodeType (object)',
        'output.reportCodeType (string)',
      );
    }
    const outputMode =
      output?.mode ??
      (compressData === true
        ? 'brief'
        : mode === 'lite'
          ? 'normal'
          : (mode ?? (brief ? 'brief' : undefined)));
    if (mode === 'lite' && output?.mode === undefined) {
      codeType ??= 'noAssetsAndModuleSource';
    }
    if (outputMode === 'brief') {
      const { writeDataJson, ...htmlOptions } = options?.htmlOptions ?? {};
      const reportHtmlName =
        htmlOptions.reportHtmlName ?? brief?.reportHtmlName;
      result.output = {
        ...currentOutput,
        mode: 'brief',
        reportCodeType: codeType === undefined ? undefined : 'noCode',
        options: {
          ...options,
          type:
            options?.type ??
            ((writeDataJson ?? brief?.writeDataJson)
              ? ['html', 'json']
              : compressData === true
                ? ['json']
                : ['html']),
          htmlOptions: { ...htmlOptions, reportHtmlName },
        },
      };
    } else {
      result.output = {
        ...currentOutput,
        mode: outputMode,
        reportCodeType: codeType,
      };
    }
  }

  if (migrations.length) {
    logger.warn(
      `Legacy Rsdoctor options detected. The compatibility layer applied the available migrations; explicit current options take precedence. Please migrate your configuration: ${migrations.join('; ')}.`,
    );
  }
  return result;
}
