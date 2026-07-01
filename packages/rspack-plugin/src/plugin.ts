import { Loader as BuildUtilLoader } from '@rsdoctor/core/build-utils';
import {
  ensureModulesChunksGraphFn,
  InternalBundlePlugin,
  InternalErrorReporterPlugin,
  InternalLoaderPlugin,
  InternalPluginsPlugin,
  InternalResolverPlugin,
  InternalRulesPlugin,
  InternalSummaryPlugin,
  normalizeRspackUserOptions,
  setSDK,
} from '@rsdoctor/core/plugins';
import type {
  RsdoctorRspackPluginInstance,
  RsdoctorRspackPluginOptions,
  RsdoctorRspackPluginOptionsNormalized,
} from '@rsdoctor/core/types';
import { findRoot, RsdoctorPrimarySDK, RsdoctorSDK } from '@rsdoctor/core/sdk';
import {
  Constants,
  Linter,
  Manifest,
  Manifest as ManifestType,
  Plugin,
  SDK,
} from '@rsdoctor/types';
import path from 'path';
import { pluginTapName, pluginTapPostOptions, pkg } from './constants';

import {
  handleBriefModeReport,
  processCompilerConfig,
} from '@rsdoctor/core/plugins';

import { ModuleGraph } from '@rsdoctor/core/graph';
import { Loader } from '@rsdoctor/core/common';
import { logger, time, timeEnd } from '@rsdoctor/core/logger';

// Static flag to ensure greet message is only printed once per process
let hasGreeted = false;

export class RsdoctorRspackPlugin<
  Rules extends Linter.ExtendRuleData[],
> implements RsdoctorRspackPluginInstance<Rules> {
  public readonly name = pluginTapName;

  public readonly sdk: SDK.RsdoctorBuilderSDKInstance | RsdoctorPrimarySDK;

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
    const { port, server, output, innerClientPath, printLog, sdkInstance } =
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
          server,
          mode: output.mode ? output.mode : undefined,
          brief:
            output.mode === SDK.IMode[SDK.IMode.brief]
              ? output.options || undefined
              : undefined,
          features: { treeShaking: this.options.features.treeShaking },
        },
      });
    this.outsideInstance = Boolean(sdkInstance);
    this.modulesGraph = new ModuleGraph() as SDK.ModuleGraphInstance;
    this.isRsdoctorPlugin = true;
  }

  // avoid hint error from ts type validation
  apply(compiler: unknown): unknown;

  apply(compiler: Plugin.BaseCompilerType<'rspack'>) {
    time('RsdoctorRspackPlugin.apply');
    try {
      if (!hasGreeted && !compiler.isChild()) {
        hasGreeted = true;
        logger.greet(`
        \nRsdoctor v${pkg.version}\n`);
      }

      // bootstrap sdk in apply()
      // Avoid creating different sdk instances when config generators recreate plugin instances.
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
          Manifest.RsdoctorManifestClientRoutes.Loaders,
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
      }

      if (this.options.features.resolver) {
        new InternalResolverPlugin<Plugin.BaseCompilerType<'rspack'>>(
          this,
        ).apply(compiler);
      }

      new InternalRulesPlugin(this).apply(compiler);

      // Keep bundler diagnostics reporting separate from Rsdoctor lint messages.
      new InternalErrorReporterPlugin(this).apply(compiler);

      // apply Rspack native plugin to improve the performance
      const RsdoctorRspackNativePlugin =
        compiler.webpack.experiments?.RsdoctorPlugin;
      if (RsdoctorRspackNativePlugin) {
        logger.debug('[RspackNativePlugin] Enabled');
        const enableNativePlugin = this.options.experiments?.enableNativePlugin;
        new RsdoctorRspackNativePlugin({
          moduleGraphFeatures: enableNativePlugin?.moduleGraph ?? true,
          chunkGraphFeatures: enableNativePlugin?.chunkGraph ?? true,
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
   * @description Generate ModuleGraph and ChunkGraph from stats and Rspack module APIs.
   * @param {Compiler} compiler
   * @return {*}
   * @memberof RsdoctorRspackPlugin
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
      logger.debug('[RsdoctorRspackPlugin] bootstrap(start) in done()');
      await this.sdk.bootstrap();
      logger.debug('[RsdoctorRspackPlugin] bootstrap(end) in done()');

      this.sdk.addClientRoutes([
        ManifestType.RsdoctorManifestClientRoutes.Overall,
      ]);

      if (this.outsideInstance && 'parent' in this.sdk) {
        this.sdk.parent.master.setOutputDir(
          path.resolve(
            this.options.output.reportDir || compiler.outputPath,
            this.options.output.mode === SDK.IMode[SDK.IMode.brief]
              ? ''
              : `./${Constants.RsdoctorOutputFolder}`,
          ),
        );
      }

      this.sdk.setOutputDir(
        path.resolve(
          this.options.output.reportDir || compiler.outputPath,
          this.options.output.mode === SDK.IMode[SDK.IMode.brief]
            ? ''
            : `./${Constants.RsdoctorOutputFolder}`,
        ),
      );
      await this.sdk.writeStore();
      if (!this.options.disableClientServer) {
        // If it's brief mode, open the static report page instead of the local server page.
        if (this.options.output.mode === SDK.IMode[SDK.IMode.brief]) {
          // Use extracted common function to handle brief mode
          await handleBriefModeReport(
            this.sdk,
            this.options,
            this.options.disableClientServer,
          );
        } else {
          await this.sdk.server.openClientPage('homepage');
        }
      }

      if (
        this.options.disableClientServer ||
        (this.options.output.mode === SDK.IMode[SDK.IMode.brief] &&
          Array.isArray(this.options.output.options?.type) &&
          this.options.output.options.type.length === 1 &&
          this.options.output.options.type[0] === 'json')
      ) {
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

      const rspackVersion =
        compiler.webpack?.rspackVersion || compiler.webpack?.version;

      // Save Rspack configuration to sdk.
      this.sdk.reportConfiguration({
        name: 'rspack',
        version: rspackVersion || 'unknown',
        config: configuration,
        root: findRoot() || '',
      });
    } finally {
      timeEnd('RsdoctorRspackPlugin.getRspackConfig');
    }
  }
}
