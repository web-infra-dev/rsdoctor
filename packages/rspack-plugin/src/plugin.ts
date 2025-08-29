import { findRoot, RsdoctorPrimarySDK, RsdoctorSDK } from '@rsdoctor/sdk';
import {
  InternalLoaderPlugin,
  InternalPluginsPlugin,
  InternalSummaryPlugin,
  setSDK,
  ensureModulesChunksGraphFn,
  InternalBundlePlugin,
  InternalRulesPlugin,
  InternalErrorReporterPlugin,
  InternalBundleTagPlugin,
  normalizeRspackUserOptions,
} from '@rsdoctor/core/plugins';
import type {
  RsdoctorRspackPluginInstance,
  RsdoctorRspackPluginOptions,
  RsdoctorRspackPluginOptionsNormalized,
} from '@rsdoctor/core/types';
import { Loader as BuildUtilLoader } from '@rsdoctor/core/build-utils';
import {
  Constants,
  Linter,
  Manifest,
  Manifest as ManifestType,
  Plugin,
  SDK,
} from '@rsdoctor/types';
import path from 'path';
import { pluginTapName, pluginTapPostOptions } from './constants';

import {
  processCompilerConfig,
  reportConfiguration,
  handleBriefModeReport,
} from '@rsdoctor/core/plugins';

import { Loader } from '@rsdoctor/utils/common';
import { chalk, logger, time, timeEnd } from '@rsdoctor/utils/logger';
import { ModuleGraph } from '@rsdoctor/graph';

export class RsdoctorRspackPlugin<Rules extends Linter.ExtendRuleData[]>
  implements RsdoctorRspackPluginInstance<Rules>
{
  public readonly name = pluginTapName;

  public readonly sdk: RsdoctorSDK | RsdoctorPrimarySDK;

  public readonly isRsdoctorPlugin: boolean;

  public _bootstrapTask!: Promise<unknown>;

  protected browserIsOpened = false;

  public modulesGraph: SDK.ModuleGraphInstance;

  public options: RsdoctorRspackPluginOptionsNormalized<Rules>;

  public outsideInstance: boolean;

  constructor(options?: RsdoctorRspackPluginOptions<Rules>) {
    this.options = normalizeRspackUserOptions<Rules>(
      Object.assign(options || {}, {
        supports: {
          ...options?.supports,
        },
      }),
    );
    const { port, output, innerClientPath, printLog, sdkInstance } =
      this.options;

    this.sdk =
      this.options.sdkInstance ??
      new RsdoctorSDK({
        port,
        name: pluginTapName,
        root: process.cwd(),
        type: output.reportCodeType,
        config: {
          innerClientPath,
          printLog,
          mode: output.mode ? output.mode : undefined,
          brief:
            'htmlOptions' in output.options
              ? output.options.htmlOptions
              : undefined,
        },
      });
    this.outsideInstance = Boolean(sdkInstance);
    this.modulesGraph = new ModuleGraph();
    this.isRsdoctorPlugin = true;
  }

  // avoid hint error from ts type validation
  apply(compiler: unknown): unknown;

  apply(compiler: Plugin.BaseCompilerType<'rspack'>) {
    time('RsdoctorRspackPlugin.apply');
    try {
      // bootstrap sdk in apply()
      // avoid to has different sdk instance in one plugin, because of webpack-chain toConfig() will new every webpack plugins.
      if (!this._bootstrapTask) {
        this._bootstrapTask = this.sdk.bootstrap();
      }

      if (compiler.options.name) {
        this.sdk.setName(compiler.options.name);
      }

      setSDK(this.sdk);

      compiler.hooks.afterPlugins.tap(
        pluginTapPostOptions,
        this.afterPlugins.bind(this, compiler),
      );
      compiler.hooks.done.tapPromise(
        {
          ...pluginTapPostOptions,
          stage: pluginTapPostOptions.stage! + 100,
        },
        this.done.bind(this, compiler),
      );

      // TODO: to fix the TypeError: Type instantiation is excessively deep and possibly infinite.
      // @ts-ignore
      new InternalSummaryPlugin<Plugin.BaseCompilerType<'rspack'>>(this).apply(
        compiler,
      );

      if (this.options.features.loader) {
        new BuildUtilLoader.ProbeLoaderPlugin().apply(compiler);
        // add loader page to client
        this.sdk.addClientRoutes([
          Manifest.RsdoctorManifestClientRoutes.WebpackLoaders,
        ]);

        if (!Loader.isVue(compiler)) {
          new InternalLoaderPlugin<Plugin.BaseCompilerType<'rspack'>>(
            this,
          ).apply(compiler);
        }
      }

      if (this.options.features.plugins) {
        new InternalPluginsPlugin<Plugin.BaseCompilerType<'rspack'>>(
          this,
        ).apply(compiler);
      }

      if (this.options.features.bundle) {
        new InternalBundlePlugin<Plugin.BaseCompilerType<'rspack'>>(this).apply(
          compiler,
        );
        new InternalBundleTagPlugin<Plugin.BaseCompilerType<'rspack'>>(
          this,
        ).apply(compiler);
      }

      if (this.options.features.resolver) {
        logger.info(
          chalk.yellow(
            'Rspack currently does not support Resolver capabilities.',
          ),
        );
      }

      new InternalRulesPlugin(this).apply(compiler);

      // InternalErrorReporterPlugin must called before InternalRulesPlugin, to avoid treat Rsdoctor's lint warnings/errors as Webpack's warnings/errors.
      new InternalErrorReporterPlugin(this).apply(compiler);

      // apply Rspack native plugin to improve the performance
      const RsdoctorRspackNativePlugin =
        compiler.webpack.experiments?.RsdoctorPlugin;
      if (RsdoctorRspackNativePlugin) {
        logger.debug('[RspackNativePlugin] Enabled');
        const enableNativePlugin = this.options.experiments?.enableNativePlugin;
        new RsdoctorRspackNativePlugin({
          moduleGraphFeatures:
            typeof enableNativePlugin === 'boolean'
              ? enableNativePlugin
              : enableNativePlugin?.moduleGraph || false,
          chunkGraphFeatures:
            typeof enableNativePlugin === 'boolean'
              ? enableNativePlugin
              : enableNativePlugin?.chunkGraph || false,
          sourceMapFeatures: {
            cheap: false,
            module: false,
          },
        }).apply(compiler);
      }
    } finally {
      timeEnd('RsdoctorRspackPlugin.apply');
    }
  }

  /**
   * @description Generate ModuleGraph and ChunkGraph from stats and webpack module apis;
   * @param {Compiler} compiler
   * @return {*}
   * @memberof RsdoctorWebpackPlugin
   */
  public ensureModulesChunksGraphApplied(
    compiler: Plugin.BaseCompilerType<'rspack'>,
  ) {
    ensureModulesChunksGraphFn(compiler, this);
  }

  public afterPlugins = (compiler: Plugin.BaseCompilerType<'rspack'>): void => {
    time('RsdoctorRspackPlugin.afterPlugins');
    try {
      this.getRspackConfig(compiler);
    } finally {
      timeEnd('RsdoctorRspackPlugin.afterPlugins');
    }
  };

  public done = async (
    compiler: Plugin.BaseCompilerType<'rspack'>,
  ): Promise<void> => {
    time('RsdoctorRspackPlugin.done');
    try {
      await this.sdk.bootstrap();

      this.sdk.addClientRoutes([
        ManifestType.RsdoctorManifestClientRoutes.Overall,
      ]);

      if (this.outsideInstance && 'parent' in this.sdk) {
        this.sdk.parent.master.setOutputDir(
          path.resolve(
            this.options.output.reportDir || compiler.outputPath,
            `./${Constants.RsdoctorOutputFolder}`,
          ),
        );
      }

      this.sdk.setOutputDir(
        path.resolve(
          this.options.output.reportDir || compiler.outputPath,
          `./${Constants.RsdoctorOutputFolder}`,
        ),
      );
      await this.sdk.writeStore();
      if (!this.options.disableClientServer) {
        // If it's brief mode, open the static report page instead of the local server page.
        if (this.options.output.mode === SDK.IMode[SDK.IMode.brief]) {
          // Use extracted common function to handle brief mode
          handleBriefModeReport(
            this.sdk,
            this.options,
            this.options.disableClientServer,
          );
        } else {
          await this.sdk.server.openClientPage('homepage');
        }
      }

      if (this.options.disableClientServer) {
        await this.sdk.dispose();
      }
    } finally {
      timeEnd('RsdoctorRspackPlugin.done');
    }
  };

  public getRspackConfig(compiler: Plugin.BaseCompilerType<'rspack'>) {
    time('RsdoctorRspackPlugin.getRspackConfig');
    try {
      if (compiler.isChild()) return;

      // Use extracted common function to process configuration
      const configuration = processCompilerConfig(compiler.options);

      const rspackVersion = compiler.webpack?.rspackVersion;
      const webpackVersion = compiler.webpack?.version;

      // Use extracted common function to report configuration
      reportConfiguration(
        this.sdk,
        rspackVersion ? 'rspack' : 'webpack',
        rspackVersion || webpackVersion || 'unknown',
        configuration,
      );

      // save webpack or rspack configuration to sdk
      this.sdk.reportConfiguration({
        name: rspackVersion ? 'rspack' : 'webpack',
        version: rspackVersion || webpackVersion || 'unknown',
        config: configuration,
        root: findRoot() || '',
      });
    } finally {
      timeEnd('RsdoctorRspackPlugin.getRspackConfig');
    }
  }
}
