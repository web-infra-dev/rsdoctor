import { Loader as BuildUtilLoader } from '../build-utils';
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
  registerSDK,
  setSDK,
  handleBriefModeReport,
  processCompilerConfig,
} from '../inner-plugins';
import type {
  RsdoctorRspackPluginInstance,
  RsdoctorRspackPluginOptions,
  RsdoctorRspackPluginOptionsNormalized,
} from '../types';
import { findRoot, RsdoctorPrimarySDK, RsdoctorSDKController } from '../sdk';
import {
  Constants,
  Linter,
  Manifest,
  Manifest as ManifestType,
  Plugin,
  SDK,
} from '@rsdoctor/shared/types';
import path from 'path';
import { Loader } from '@rsdoctor/shared/common-browser';
import { ModuleGraph } from '@rsdoctor/shared/graph';
import { pluginTapName, pluginTapPostOptions, pkg } from './constants';
import { logger, time, timeEnd } from '../logger';
import { getRspackNativePlugin } from '../inner-plugins/plugins/rspack';

// Static flag to ensure greet message is only printed once per process
let hasGreeted = false;

export class RsdoctorRspackPlugin<
  Rules extends Linter.ExtendRuleData[],
> implements RsdoctorRspackPluginInstance<Rules> {
  public readonly name = pluginTapName;

  public readonly sdk: SDK.RsdoctorBuilderSDKInstance;

  public readonly isRsdoctorPlugin: boolean;

  public _bootstrapTask!: Promise<unknown>;

  protected browserIsOpened = false;

  public modulesGraph: SDK.ModuleGraphInstance;

  public options: RsdoctorRspackPluginOptionsNormalized<Rules>;

  public outsideInstance: boolean;

  protected readonly controller?: RsdoctorSDKController;

  private readonly childOptions: RsdoctorRspackPluginOptions<Rules>;

  private readonly childPlugins = new Map<
    string,
    {
      compiler: Plugin.BaseCompilerType<'rspack'>;
      sdk: RsdoctorPrimarySDK;
    }
  >();

  constructor(options?: RsdoctorRspackPluginOptions<Rules>) {
    this.childOptions = {
      ...options,
      supports: {
        ...options?.supports,
      },
    };
    this.options = normalizeRspackUserOptions<Rules>(this.childOptions);
    const { server, output, innerClientPath, printLog, sdkInstance } =
      this.options;

    if (sdkInstance) {
      this.sdk = sdkInstance;
      if (sdkInstance instanceof RsdoctorPrimarySDK) {
        this.controller = sdkInstance.parent;
      }
    } else {
      const controller = new RsdoctorSDKController();
      this.controller = controller;
      this.sdk = controller.createSlave({
        name: pluginTapName,
        displayName: 'Main compiler',
        compilerPath: '',
        isChild: false,
        stage: 0,
        type: output.reportCodeType,
        extraConfig: {
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
    }
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

      if (compiler.options.name && !compiler.isChild()) {
        this.sdk.setName(compiler.options.name);
      }

      if (compiler.isChild()) {
        registerSDK(this.sdk);
      } else {
        setSDK(this.sdk);
      }

      this.applyChildCompilerSupport(compiler);

      if (compiler.isChild()) {
        this.getRspackConfig(compiler);
        compiler.hooks.afterCompile.tapPromise(
          {
            ...pluginTapPostOptions,
            stage: pluginTapPostOptions.stage! + 100,
          },
          this.childDone.bind(this, compiler),
        );
      } else {
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
      }

      // TODO: to fix the TypeError: Type instantiation is excessively deep and possibly infinite.
      // @ts-ignore
      new InternalSummaryPlugin<Plugin.BaseCompilerType<'rspack'>>(this).apply(
        compiler,
      );

      if (this.options.features.loader) {
        if (!compiler.isChild()) {
          new BuildUtilLoader.ProbeLoaderPlugin().apply(compiler);
        }
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

      const RsdoctorRspackNativePlugin = getRspackNativePlugin(compiler);
      logger.debug('[RspackNativePlugin] Enabled');
      new RsdoctorRspackNativePlugin({
        moduleGraphFeatures: true,
        chunkGraphFeatures: true,
        sourceMapFeatures: {
          cheap: false,
          module: false,
        },
      }).apply(compiler);
    } finally {
      timeEnd('RsdoctorRspackPlugin.apply');
    }
  }

  /**
   * @description Generate ModuleGraph and ChunkGraph from the Rspack native plugin.
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

  private getOutputDir(compiler: Plugin.BaseCompilerType<'rspack'>) {
    return path.resolve(
      this.options.output.reportDir || compiler.outputPath,
      this.options.output.mode === SDK.IMode[SDK.IMode.brief]
        ? ''
        : `./${Constants.RsdoctorOutputFolder}`,
    );
  }

  private applyChildCompilerSupport(
    compiler: Plugin.BaseCompilerType<'rspack'>,
  ) {
    compiler.hooks.thisCompilation.tap(
      {
        name: `${pluginTapName}:childCompiler`,
        stage: -999,
      },
      (compilation) => {
        compilation.hooks.childCompiler.tap(
          `${pluginTapName}:childCompiler`,
          (childCompiler, compilerName, compilerIndex) => {
            this.registerChildCompiler(
              compiler,
              childCompiler as Plugin.BaseCompilerType<'rspack'>,
              compilerName,
              compilerIndex,
            );
          },
        );
      },
    );
  }

  private registerChildCompiler(
    parentCompiler: Plugin.BaseCompilerType<'rspack'>,
    childCompiler: Plugin.BaseCompilerType<'rspack'>,
    compilerName: string,
    compilerIndex: number,
  ) {
    if (!this.controller || !(this.sdk instanceof RsdoctorPrimarySDK)) {
      return;
    }

    const compilerPath =
      childCompiler.compilerPath ||
      `${parentCompiler.compilerPath}${compilerName}|${compilerIndex}|`;
    const registeredChild = this.childPlugins.get(compilerPath);
    if (registeredChild?.compiler === childCompiler) {
      return;
    }

    this.controller.master.setOutputDir(this.getOutputDir(parentCompiler));

    const childSDK = (() => {
      if (registeredChild) {
        return registeredChild.sdk;
      }

      const safeCompilerPath =
        compilerPath.replace(/[^a-zA-Z0-9._-]+/g, '-') ||
        `${compilerName}-${compilerIndex}`;
      const displayName =
        childCompiler.name || compilerName || `Child compiler ${compilerIndex}`;
      const sdk = this.controller!.createSlave({
        name: `child-${safeCompilerPath}`,
        displayName,
        compilerPath,
        parentCompilerPath: parentCompiler.compilerPath || '',
        isChild: true,
        stage: this.sdk.stage + (this.controller!.slaves.length + 1) / 1000,
        extraConfig: this.sdk.extraConfig,
        type: this.sdk.type,
      });
      // Child compilers finish before the main compiler writes its pieces.
      // Avoid waiting for the main manifest from the child lifecycle.
      sdk.dependencies = [this.sdk.name];
      return sdk;
    })();

    this.removeInheritedRsdoctorTaps(childCompiler);

    const childPlugin = new RsdoctorRspackPlugin({
      ...this.childOptions,
      sdkInstance: childSDK,
    });
    this.childPlugins.set(compilerPath, {
      compiler: childCompiler,
      sdk: childSDK,
    });
    childPlugin.apply(childCompiler);
  }

  private removeInheritedRsdoctorTaps(
    compiler: Plugin.BaseCompilerType<'rspack'>,
  ) {
    for (const hook of Object.values(compiler.hooks)) {
      const mutableHook = hook as unknown as {
        taps?: Array<{ name: string }>;
      };
      if (!Array.isArray(mutableHook.taps)) {
        continue;
      }
      mutableHook.taps = mutableHook.taps.filter(
        (tap) =>
          tap.name !== pluginTapName &&
          !tap.name.startsWith(`${pluginTapName}:`),
      );
    }
  }

  private childDone = async (
    compiler: Plugin.BaseCompilerType<'rspack'>,
  ): Promise<void> => {
    await this.sdk.bootstrap();
    this.sdk.addClientRoutes([
      ManifestType.RsdoctorManifestClientRoutes.Overall,
    ]);
    this.sdk.setOutputDir(this.getOutputDir(compiler));
    await this.sdk.writeStore();

    if (this.options.disableClientServer) {
      await this.sdk.dispose();
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

      if (this.outsideInstance && this.sdk instanceof RsdoctorPrimarySDK) {
        this.sdk.parent.master.setOutputDir(this.getOutputDir(compiler));
      }

      this.sdk.setOutputDir(this.getOutputDir(compiler));
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
      // Use extracted common function to process configuration
      const configuration = processCompilerConfig(compiler.options);
      if (compiler.isChild() && compiler.name) {
        configuration.name = compiler.name;
      }

      const { rspackVersion } = compiler.rspack;

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
