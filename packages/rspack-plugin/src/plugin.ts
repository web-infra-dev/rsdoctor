import type { Compiler, Configuration, RuleSetRule, Stats } from '@rspack/core';
import { ModuleGraph } from '@rsdoctor/graph';
import { RsdoctorSlaveSDK, RsdoctorWebpackSDK } from '@rsdoctor/sdk';
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
  InternalErrorReporterPlugin,
  InternalBundleTagPlugin,
} from '@rsdoctor/core/plugins';
import type {
  RsdoctorPluginInstance,
  RsdoctorPluginOptionsNormalized,
  RsdoctorRspackPluginOptions,
} from '@rsdoctor/core';
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
import { ProbeLoaderPlugin } from './probeLoaderPlugin';
import { Loader } from '@rsdoctor/utils/common';

export class RsdoctorRspackPlugin<Rules extends Linter.ExtendRuleData[]>
  implements RsdoctorPluginInstance<Compiler, Rules>
{
  public readonly name = pluginTapName;

  public readonly sdk: RsdoctorWebpackSDK | RsdoctorSlaveSDK;

  public _bootstrapTask!: Promise<unknown>;

  protected browserIsOpened = false;

  public modulesGraph: ModuleGraph;

  public options: RsdoctorPluginOptionsNormalized<Rules>;

  public outsideInstance: boolean;

  constructor(options?: RsdoctorRspackPluginOptions<Rules>) {
    this.options = normalizeUserConfig<Rules>(options);
    this.sdk =
      this.options.sdkInstance ??
      new RsdoctorWebpackSDK({
        name: pluginTapName,
        root: process.cwd(),
        type: SDK.ToDataType.Normal,
        config: { disableTOSUpload: this.options.disableTOSUpload },
        innerClientPath: this.options.innerClientPath,
      });
    this.outsideInstance = Boolean(this.options.sdkInstance);
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

    if (compiler.options.name) {
      this.sdk.setName(compiler.options.name);
    }

    setSDK(this.sdk);

    compiler.hooks.done.tapPromise(
      {
        ...pluginTapPostOptions,
        stage: pluginTapPostOptions.stage! + 100,
      },
      this.done.bind(this, compiler),
    );

    // TODO: to fix the TypeError: Type instantiation is excessively deep and possibly infinite.
    // @ts-ignore
    new InternalSummaryPlugin<Compiler>(this).apply(compiler);

    if (this.options.features.loader && !Loader.isVue(compiler)) {
      new ProbeLoaderPlugin().apply(compiler);
      new InternalLoaderPlugin<Compiler>(this).apply(compiler);
    }

    if (this.options.features.plugins) {
      new InternalPluginsPlugin<Compiler>(this).apply(compiler);
    }

    if (this.options.features.bundle) {
      new InternalBundlePlugin<Compiler>(this).apply(compiler);
      new InternalBundleTagPlugin<Compiler>(this).apply(compiler);
    }

    new InternalRulesPlugin(this).apply(compiler);

    // InternalErrorReporterPlugin must called before InternalRulesPlugin, to avoid treat Rsdoctor's lint warnings/errors as Webpack's warnings/errors.
    new InternalErrorReporterPlugin(this).apply(compiler);
  }

  /**
   * @description Generate ModuleGraph and ChunkGraph from stats and webpack module apis;
   * @param {Compiler} compiler
   * @return {*}
   * @memberof RsdoctorWebpackPlugin
   */
  public ensureModulesChunksGraphApplied(compiler: Compiler) {
    ensureModulesChunksGraphFn(compiler, this);
  }

  public done = async (compiler: Compiler, stats: Stats): Promise<void> => {
    const json = stats.toJson({
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

    if (this.outsideInstance && 'parent' in this.sdk) {
      this.sdk.parent.master.setOutputDir(
        path.resolve(
          compiler.outputPath,
          `./${Constants.RsdoctorOutputFolder}`,
        ),
      );
    }

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
  }
}
