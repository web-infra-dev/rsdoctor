import { Compiler, Configuration, RuleSetRule } from '@rspack/core';
import { ModuleGraph } from '@rsdoctor/graph';
import { RsdoctorWebpackSDK } from '@rsdoctor/sdk';
import {
  InternalLoaderPlugin,
  InternalPluginsPlugin,
  InternalSummaryPlugin,
  makeRulesSerializable,
  normalizeUserConfig,
  setSDK,
  ensureModulesChunksGraphFn,
  InternalBundlePlugin,
  InternalRulesPlugin,
} from '@rsdoctor/core/plugins';
import type {
  RsdoctorPluginInstance,
  RsdoctorPluginOptionsNormalized,
  RsdoctorRspackPluginOptions,
} from '@rsdoctor/core/types';
import {
  Constants,
  Linter,
  Manifest as ManifestType,
  Plugin,
  SDK,
} from '@rsdoctor/types';
import path from 'path';
import { pluginTapName, pluginTapPostOptions } from './constants';
import { cloneDeep } from 'lodash';
import { BuiltinLoaderPlugin } from './builtinLoaderPlugin';

export class RsdoctorRspackPlugin<Rules extends Linter.ExtendRuleData[]>
  implements RsdoctorPluginInstance<Compiler, Rules>
{
  public readonly name = pluginTapName;

  public readonly sdk: RsdoctorWebpackSDK;

  public _bootstrapTask!: Promise<unknown>;

  protected browserIsOpened = false;

  public modulesGraph: ModuleGraph;

  public options: RsdoctorPluginOptionsNormalized<Rules>;

  constructor(options?: RsdoctorRspackPluginOptions<Rules>) {
    this.options = normalizeUserConfig<Rules>(options);
    this.sdk = new RsdoctorWebpackSDK({
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

    if (this.options.features.bundle) {
      new InternalBundlePlugin<Compiler>(this).apply(compiler);
    }

    new InternalRulesPlugin(this).apply(compiler);
    new BuiltinLoaderPlugin().apply(compiler);
  }


  /**
   * @description Generate ModuleGraph and ChunkGraph from stats and webpack module apis;
   * @param {Compiler} compiler
   * @return {*}
   * @memberof RsdoctorWebpackPlugin
   */
  public ensureModulesChunksGraphApplied(compiler: Compiler) {
    ensureModulesChunksGraphFn(compiler, this)
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

    this.getRspackConfig(compiler, json.rspackVersion || '');

    await this.sdk.bootstrap();

    this.sdk.addClientRoutes([
      ManifestType.RsdoctorManifestClientRoutes.Overall,
    ]);

    this.sdk.setOutputDir(
      path.resolve(compiler.outputPath, `./${Constants.RsdoctorOutputFolder}`),
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
      path.resolve(compiler.outputPath, `./${Constants.RsdoctorOutputFolder}`),
    );

    if (configuration.name) {
      this.sdk.setName(configuration.name);
    }
  }
}
