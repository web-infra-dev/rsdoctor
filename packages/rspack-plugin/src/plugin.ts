import type { Configuration, RuleSetRule } from '@rspack/core';
import { ModuleGraph } from '@rsdoctor/graph';
import {
  openBrowser,
  RsdoctorSlaveSDK,
  RsdoctorWebpackSDK,
} from '@rsdoctor/sdk';
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
  RsdoctorRspackPluginInstance,
  RsdoctorPluginOptionsNormalized,
  RsdoctorRspackPluginOptions,
} from '@rsdoctor/core';
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
import { cloneDeep } from 'lodash';

import { Loader } from '@rsdoctor/utils/common';
import { chalk } from '@rsdoctor/utils/logger';

export class RsdoctorRspackPlugin<Rules extends Linter.ExtendRuleData[]>
  implements RsdoctorRspackPluginInstance<Rules>
{
  public readonly name = pluginTapName;

  public readonly sdk: RsdoctorWebpackSDK | RsdoctorSlaveSDK;

  public readonly isRsdoctorPlugin: boolean;

  public _bootstrapTask!: Promise<unknown>;

  protected browserIsOpened = false;

  public modulesGraph: ModuleGraph;

  public options: RsdoctorPluginOptionsNormalized<Rules>;

  public outsideInstance: boolean;

  constructor(options?: RsdoctorRspackPluginOptions<Rules>) {
    this.options = normalizeUserConfig<Rules>(
      Object.assign(options || {}, {
        supports: {
          ...options?.supports,
          // Generate Tile Graph default false in rspack builder.
          generateTileGraph: options?.supports?.generateTileGraph
            ? options?.supports?.generateTileGraph
            : false,
        },
      }),
    );
    this.sdk =
      this.options.sdkInstance ??
      new RsdoctorWebpackSDK({
        port: this.options.port,
        name: pluginTapName,
        root: process.cwd(),
        type: this.options.reportCodeType,
        config: {
          disableTOSUpload: this.options.disableTOSUpload,
          innerClientPath: this.options.innerClientPath,
          printLog: this.options.printLog,
          mode: this.options.mode ? this.options.mode : undefined,
          brief: this.options.brief,
        },
      });
    this.outsideInstance = Boolean(this.options.sdkInstance);
    this.modulesGraph = new ModuleGraph();
    this.isRsdoctorPlugin = true;
  }

  // avoid hint error from ts type validation
  apply(compiler: unknown): unknown;

  apply(compiler: Plugin.BaseCompilerType<'rspack'>) {
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
        new InternalLoaderPlugin<Plugin.BaseCompilerType<'rspack'>>(this).apply(
          compiler,
        );
      }
    }

    if (this.options.features.plugins) {
      new InternalPluginsPlugin<Plugin.BaseCompilerType<'rspack'>>(this).apply(
        compiler,
      );
    }

    if (this.options.features.bundle) {
      new InternalBundlePlugin<Plugin.BaseCompilerType<'rspack'>>(this).apply(
        compiler,
      );
      new InternalBundleTagPlugin<Plugin.BaseCompilerType<'rspack'>>(
        this,
      ).apply(compiler);
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
  public ensureModulesChunksGraphApplied(
    compiler: Plugin.BaseCompilerType<'rspack'>,
  ) {
    ensureModulesChunksGraphFn(compiler, this);
  }

  public done = async (
    compiler: Plugin.BaseCompilerType<'rspack'>,
  ): Promise<void> => {
    this.getRspackConfig(compiler);

    await this.sdk.bootstrap();

    this.sdk.addClientRoutes([
      ManifestType.RsdoctorManifestClientRoutes.Overall,
    ]);

    if (this.outsideInstance && 'parent' in this.sdk) {
      this.sdk.parent.master.setOutputDir(
        path.resolve(
          this.options.reportDir || compiler.outputPath,
          `./${Constants.RsdoctorOutputFolder}`,
        ),
      );
    }

    this.sdk.setOutputDir(
      path.resolve(
        this.options.reportDir || compiler.outputPath,
        `./${Constants.RsdoctorOutputFolder}`,
      ),
    );
    await this.sdk.writeStore();
    if (!this.options.disableClientServer) {
      if (this.options.mode === SDK.IMode[SDK.IMode.brief]) {
        const outputFilePath = path.resolve(
          this.sdk.outputDir,
          this.options.brief.reportHtmlName || 'rsdoctor-report.html',
        );

        console.log(
          `${chalk.green('[RSDOCTOR] generated brief report')}: ${outputFilePath}`,
        );

        openBrowser(`file:///${outputFilePath}`);
      } else {
        await this.sdk.server.openClientPage('homepage');
      }
    }

    if (this.options.disableClientServer) {
      await this.sdk.dispose();
    }
  };

  public getRspackConfig(compiler: Plugin.BaseCompilerType<'rspack'>) {
    if (compiler.isChild()) return;
    const { plugins, infrastructureLogging, ...rest } = compiler.options;
    const _rest = cloneDeep(rest);

    makeRulesSerializable(_rest.module.defaultRules as RuleSetRule[]);
    makeRulesSerializable(_rest.module.rules as RuleSetRule[]);

    const configuration = {
      ..._rest,
      plugins: plugins.map((e) => e?.constructor.name),
    } as unknown as Configuration;

    const rspackVersion = compiler.webpack?.rspackVersion;
    const webpackVersion = compiler.webpack?.version;

    // save webpack or rspack configuration to sdk
    this.sdk.reportConfiguration({
      name: rspackVersion ? 'rspack' : 'webpack',
      version: rspackVersion || webpackVersion || 'unknown',
      config: configuration,
    });

    this.sdk.setOutputDir(
      path.resolve(
        this.options.reportDir || compiler.outputPath,
        `./${Constants.RsdoctorOutputFolder}`,
      ),
    );
  }
}
