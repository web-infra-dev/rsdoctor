import { Compiler, Configuration, RuleSetRule } from '@rspack/core';
import fs from 'fs';
import { ModuleGraph } from '@rsdoctor/graph';
import { DoctorWebpackSDK } from '@rsdoctor/sdk';
import { Chunks } from '@rsdoctor/core/build-utils';
import {
  InternalLoaderPlugin,
  InternalPluginsPlugin,
  InternalSummaryPlugin,
  makeRulesSerializable,
  normalizeUserConfig,
  setSDK,
} from '@rsdoctor/core/plugins';
import type {
  DoctorPluginInstance,
  DoctorPluginOptionsNormalized,
  DoctorRspackPluginOptions,
} from '@rsdoctor/core/types';
import {
  Constants,
  Linter,
  Manifest as ManifestType,
  Plugin,
  SDK,
} from '@rsdoctor/types';
import path from 'path';
import { TransUtils } from '@rsdoctor/core/common-utils';
import { pluginTapName, pluginTapPostOptions } from './constants';
import { cloneDeep } from 'lodash';

export class RsdoctorRspackPlugin<Rules extends Linter.ExtendRuleData[]>
  implements DoctorPluginInstance<Compiler, Rules>
{
  public readonly name = pluginTapName;

  public readonly sdk: DoctorWebpackSDK;

  public _bootstrapTask!: Promise<unknown>;

  protected browserIsOpened = false;

  public modulesGraph: ModuleGraph;

  public options: DoctorPluginOptionsNormalized<Rules>;

  constructor(options?: DoctorRspackPluginOptions<Rules>) {
    this.options = normalizeUserConfig<Rules>(options);
    this.sdk = new DoctorWebpackSDK({
      name: pluginTapName,
      root: process.cwd(),
      type: SDK.ToDataType.Normal,
      config: { disableTOSUpload: this.options.disableTOSUpload },
    });
    this.modulesGraph = new ModuleGraph();
  }

  // avoid hint error from ts type validation
  apply(compiler: unknown): unknown;

  apply(compiler: Compiler) {
    // bootstrap sdk in apply()
    // avoid to has different sdk instance in one plugin, because of webpack-chain toConfig() will new every webpack plugins.
    if (!this._bootstrapTask) {
      this._bootstrapTask = this.sdk.bootstrap();
    }

    setSDK(this.sdk);

    compiler.hooks.done.tapPromise(
      {
        ...pluginTapPostOptions,
        stage: pluginTapPostOptions.stage! + 100,
      },
      this.done.bind(this, compiler),
    );

    new InternalSummaryPlugin(this).apply(compiler);

    if (this.options.features.loader) {
      new InternalLoaderPlugin<Compiler>(this).apply(compiler);
    }

    if (this.options.features.plugins) {
      new InternalPluginsPlugin<Compiler>(this).apply(compiler);
    }
  }

  public done = async (compiler: Compiler): Promise<void> => {
    
    const json = compiler.compilation
    .getStats()
    .toJson({
      all: false,
      version: true,
      chunks: true,
      modules: true,
      chunkModules: true,
      assets: true,
      builtAt: true,
      chunkRelations: true,
    }) as Plugin.StatsCompilation; // TODO: if this type can compatible?
    const { chunkGraph, moduleGraph } = await TransUtils.transStats(json);

    this.getRspackConfig(compiler, json.rspackVersion || '');

    await this.sdk.bootstrap();
    this.sdk.reportChunkGraph(chunkGraph);
    this.sdk.reportModuleGraph(moduleGraph);
    this.sdk.addClientRoutes([
      ManifestType.DoctorManifestClientRoutes.Overall,
      ManifestType.DoctorManifestClientRoutes.BundleSize,
      ManifestType.DoctorManifestClientRoutes.ModuleGraph,
    ]);

    /** Generate rspack-bundle-analyzer tile graph */
    const reportFilePath = await Chunks.generateTileGraph(
      json as Plugin.BaseStats,
      {
        reportFilename: Chunks.TileGraphReportName,
        reportTitle: 'webpack-bundle-analyzer',
      },
      compiler.outputPath,
    );
    reportFilePath &&
      (await this.sdk.reportTileHtml(fs.readFileSync(reportFilePath, 'utf-8')));

    this.sdk.setOutputDir(
      path.resolve(compiler.outputPath, `./${Constants.DoctorOutputFolder}`),
    );
    await this.sdk.writeStore();
    if (!this.options.disableClientServer) {
      await this.sdk.server.openClientPage('homepage');
    }

    if (this.options.disableClientServer) {
      await this.sdk.dispose();
    }
  };

  public getRspackConfig(compiler: Compiler, version: string) {
    if (compiler.isChild()) return;
    const { plugins, infrastructureLogging, ...rest } = compiler.options;
    const _rest = cloneDeep(rest);

    makeRulesSerializable(_rest.module.defaultRules as RuleSetRule[]);
    makeRulesSerializable(_rest.module.rules as RuleSetRule[]);

    const configuration = {
      ..._rest,
      plugins: plugins.map((e) => e?.constructor.name),
    } as unknown as Configuration;

    // save webpack configuration to sdk
    this.sdk.reportConfiguration({
      name: 'rspack',
      version: version || 'unknown',
      config: configuration,
    });

    this.sdk.setOutputDir(
      path.resolve(compiler.outputPath, `./${Constants.DoctorOutputFolder}`),
    );

    if (configuration.name) {
      this.sdk.setName(configuration.name);
    }
  }

  public ensureModulesChunksGraphApplied() {
    // empty functions
  }
}
