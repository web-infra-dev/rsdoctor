import {
  InternalErrorReporterPlugin,
  InternalLoaderPlugin,
  InternalPluginsPlugin,
  InternalProgressPlugin,
  InternalSummaryPlugin,
  InternalRulesPlugin,
  InternalBundlePlugin,
  makeRulesSerializable,
  normalizeUserConfig,
  setSDK,
  InternalBundleTagPlugin,
} from '@rsdoctor/core/plugins';
import type {
  RsdoctorPluginInstance,
  RsdoctorPluginOptionsNormalized,
  RsdoctorWebpackPluginOptions,
} from '@rsdoctor/core/types';
import { ChunkGraph, ModuleGraph } from '@rsdoctor/graph';
import { RsdoctorWebpackSDK } from '@rsdoctor/sdk';
import { Constants, Linter } from '@rsdoctor/types';
import { Process } from '@rsdoctor/utils/build';
import { debug } from '@rsdoctor/utils/logger';
import { cloneDeep } from 'lodash';
import path from 'path';
import type { Compiler, Configuration, RuleSetRule } from 'webpack';
import { pluginTapName, pluginTapPostOptions } from './constants';

import { InternalResolverPlugin } from './plugins/resolver';
import { ensureModulesChunksGraphFn } from '@rsdoctor/core/plugins';
import { Loader } from '@rsdoctor/utils/common';

export class RsdoctorWebpackPlugin<Rules extends Linter.ExtendRuleData[]>
  implements RsdoctorPluginInstance<Compiler, Rules>
{
  public readonly name = pluginTapName;

  public readonly options: RsdoctorPluginOptionsNormalized<Rules>;

  public readonly sdk: RsdoctorWebpackSDK;

  public modulesGraph: ModuleGraph;

  private outsideInstance = false;

  public _bootstrapTask!: Promise<unknown>;

  protected browserIsOpened = false;

  public chunkGraph: ChunkGraph;

  constructor(options?: RsdoctorWebpackPluginOptions<Rules>) {
    this.options = normalizeUserConfig<Rules>(options);
    this.sdk =
      this.options.sdkInstance ??
      new RsdoctorWebpackSDK({
        name: pluginTapName,
        root: process.cwd(),
        type: this.options.reportCodeType,
        config: { disableTOSUpload: this.options.disableTOSUpload },
        innerClientPath: this.options.innerClientPath,
      });
    this.outsideInstance = Boolean(this.options.sdkInstance);
    this.modulesGraph = new ModuleGraph();
    this.chunkGraph = new ChunkGraph();
  }

  // avoid hint error from ts type validation
  apply(compiler: unknown): unknown;

  apply(compiler: Compiler) {
    // bootstrap sdk in apply()
    // avoid to has different sdk instance in one plugin, because of webpack-chain toConfig() will new every webpack plugins.
    if (!this._bootstrapTask) {
      this._bootstrapTask = this.sdk.bootstrap();
    }

    // External instances do not need to be injected into the global.
    if (!this.outsideInstance) {
      setSDK(this.sdk);
    }
    // TODO: to fix the TypeError: Type instantiation is excessively deep and possibly infinite.
    // @ts-ignore
    new InternalSummaryPlugin<Compiler>(this).apply(compiler);

    if (this.options.features.loader && !Loader.isVue(compiler)) {
      new InternalLoaderPlugin<Compiler>(this).apply(compiler);
    }

    if (this.options.features.resolver) {
      new InternalResolverPlugin(this).apply(compiler);
    }

    if (this.options.features.plugins) {
      new InternalPluginsPlugin<Compiler>(this).apply(compiler);
    }

    if (this.options.features.bundle) {
      new InternalBundlePlugin<Compiler>(this).apply(compiler);
      new InternalBundleTagPlugin<Compiler>(this).apply(compiler);
    }

    // InternalErrorReporterPlugin must called before InternalRulesPlugin, to avoid treat Rsdoctor's lint warnings/errors as Webpack's warnings/errors.
    new InternalErrorReporterPlugin(this).apply(compiler);
    // InternalRulesPlugin will add lint errors and warnings to Webpack compilation as Webpack's warnings/errors.
    new InternalRulesPlugin(this).apply(compiler);

    new InternalProgressPlugin<Compiler>(this).apply(compiler);

    compiler.hooks.afterPlugins.tap(pluginTapPostOptions, this.afterPlugins);
    // watchRun will executed in watch mode.
    compiler.hooks.watchRun.tapPromise(pluginTapPostOptions, this.beforeRun);
    // beforeRun will not executed in watch mode.
    compiler.hooks.beforeRun.tapPromise(pluginTapPostOptions, this.beforeRun);
    compiler.hooks.done.tapPromise(
      {
        ...pluginTapPostOptions,
        stage: pluginTapPostOptions.stage! + 100,
      },
      this.done.bind(this),
    );
  }

  public afterPlugins = (compiler: Compiler): void => {
    if (compiler.isChild()) return;

    // deep clone before intercept
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
      name: 'webpack',
      version: compiler.webpack?.version || 'unknown',
      config: configuration,
    });

    this.sdk.setOutputDir(
      path.resolve(compiler.outputPath, `./${Constants.RsdoctorOutputFolder}`),
    );

    if (configuration.name) {
      this.sdk.setName(configuration.name);
    }
  };

  public beforeRun = async (compiler: Compiler): Promise<void> => {
    if (compiler.isChild()) return;

    await this._bootstrapTask.then(() => {
      if (!this.options.disableClientServer && !this.browserIsOpened) {
        this.browserIsOpened = true;
        this.sdk.server.openClientPage();
      }
    });
  };

  /**
   * @description Generate ModuleGraph and ChunkGraph from stats and webpack module apis;
   * @param {Compiler} compiler
   * @return {*}
   * @memberof RsdoctorWebpackPlugin
   */
  public ensureModulesChunksGraphApplied(compiler: Compiler) {
    ensureModulesChunksGraphFn(compiler, this);
  }

  public done = async (): Promise<void> => {
    try {
      this.sdk.server.broadcast();
      debug(Process.getMemoryUsageMessage, '[Before Write Manifest]');
      await this.sdk.writeStore();
      debug(Process.getMemoryUsageMessage, '[After Write Manifest]');

      if (this.options.disableClientServer) {
        await this.sdk.dispose();
        debug(Process.getMemoryUsageMessage, '[After SDK Dispose]');
      }
    } catch (e) {}
  };
}
