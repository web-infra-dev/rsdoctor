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
import { findRoot, openBrowser, RsdoctorSDK } from '@rsdoctor/sdk';
import { Constants, Linter, Manifest, SDK } from '@rsdoctor/types';
import { Process } from '@rsdoctor/utils/build';
import { chalk, logger } from '@rsdoctor/utils/logger';
import { cloneDeep } from 'lodash';
import path from 'path';
import type { Compiler, Configuration, RuleSetRule } from 'webpack';
import { pluginTapName, pluginTapPostOptions } from './constants';

import { InternalResolverPlugin } from './plugins/resolver';
import { ensureModulesChunksGraphFn } from '@rsdoctor/core/plugins';
import { Loader } from '@rsdoctor/utils/common';
import { Loader as BuildUtilLoader } from '@rsdoctor/core/build-utils';

export class RsdoctorWebpackPlugin<Rules extends Linter.ExtendRuleData[]>
  implements RsdoctorPluginInstance<Compiler, Rules>
{
  public readonly name = pluginTapName;

  public readonly options: RsdoctorPluginOptionsNormalized<Rules>;

  public readonly sdk: RsdoctorSDK;

  public readonly isRsdoctorPlugin: boolean;

  public modulesGraph: ModuleGraph;

  public _bootstrapTask!: Promise<unknown>;

  protected browserIsOpened = false;

  public chunkGraph: ChunkGraph;

  constructor(options?: RsdoctorWebpackPluginOptions<Rules>) {
    this.options = normalizeUserConfig<Rules>(options);
    this.sdk =
      this.options.sdkInstance ??
      new RsdoctorSDK({
        port: this.options.port,
        name: pluginTapName,
        root: process.cwd(),
        type: this.options.output.reportCodeType,
        config: {
          innerClientPath: this.options.innerClientPath,
          printLog: this.options.printLog,
          mode: this.options.mode,
          brief: this.options.brief,
          compressData: this.options.output.compressData,
          noServer: this.options.disableClientServer,
        },
      });

    this.modulesGraph = new ModuleGraph();
    this.chunkGraph = new ChunkGraph();
    this.isRsdoctorPlugin = true;
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
    setSDK(this.sdk);

    // TODO: to fix the TypeError: Type instantiation is excessively deep and possibly infinite.
    // @ts-ignore
    new InternalSummaryPlugin<Compiler>(this).apply(compiler);

    if (this.options.features.loader) {
      new BuildUtilLoader.ProbeLoaderPlugin().apply(compiler);
      // add loader page to client
      this.sdk.addClientRoutes([
        Manifest.RsdoctorManifestClientRoutes.WebpackLoaders,
      ]);

      if (!Loader.isVue(compiler)) {
        new InternalLoaderPlugin(this).apply(compiler);
      }
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

    // @ts-expect-error
    const rspackVersion = compiler.webpack?.rspackVersion;
    const webpackVersion = compiler.webpack?.version;

    // save webpack or rspack configuration to sdk
    this.sdk.reportConfiguration({
      name: rspackVersion ? 'rspack' : 'webpack',
      version: rspackVersion || webpackVersion || 'unknown',
      config: configuration,
      root: findRoot() || '',
    });

    this.sdk.setOutputDir(
      path.resolve(
        this.options.output.reportDir || compiler.outputPath,
        `./${Constants.RsdoctorOutputFolder}`,
      ),
    );

    if (configuration.name) {
      this.sdk.setName(configuration.name);
    }
  };

  public beforeRun = async (compiler: Compiler): Promise<void> => {
    if (compiler.isChild()) return;

    await this._bootstrapTask.then(() => {
      if (!this.options.disableClientServer && !this.browserIsOpened) {
        if (this.options.mode !== SDK.IMode[SDK.IMode.brief]) {
          this.browserIsOpened = true;
          this.sdk.server.openClientPage();
        }
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
      logger.debug(
        `${Process.getMemoryUsageMessage()}, '[Before Write Manifest]'`,
      );
      await this.sdk.writeStore();
      logger.debug(
        `${Process.getMemoryUsageMessage()}, '[After Write Manifest]'`,
      );

      if (this.options.disableClientServer) {
        await this.sdk.dispose();
        logger.debug(
          `${Process.getMemoryUsageMessage()}, '[After SDK Dispose]'`,
        );
      } else if (
        this.options.mode === SDK.IMode[SDK.IMode.brief] &&
        !this.options.disableClientServer
      ) {
        const outputFilePath = path.resolve(
          this.sdk.outputDir,
          this.options.brief.reportHtmlName || 'rsdoctor-report.html',
        );
        console.log(
          `${chalk.green('[RSDOCTOR] generated brief report')}: ${outputFilePath}`,
        );
        openBrowser(`file:///${outputFilePath}`);
      }
    } catch (e) {
      console.error(`[Rsdoctor] Webpack plugin this.done error`, e);
    }
  };
}
