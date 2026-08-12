import { Constants, Manifest, SDK } from '@rsdoctor/shared/types';
import { RsdoctorSDK } from '../sdk';
import { RsdoctorSlaveServer } from './server';
import type { RsdoctorSDKController } from './controller';

let id = 1;

interface RsdoctorSlaveSDKOptions {
  name: string;
  displayName?: string;
  compilerPath?: string;
  parentCompilerPath?: string;
  isChild?: boolean;
  /**
   * use to sort for display in the client page.
   * the smaller the front.
   * @default 1
   */
  stage?: number;
  extraConfig?: SDK.SDKOptionsType;
  controller: RsdoctorSDKController;
  type: SDK.ToDataType;
}

export class RsdoctorPrimarySDK
  extends RsdoctorSDK
  implements SDK.RsdoctorBuilderSDKInstance
{
  id: number;

  parent: RsdoctorSDKController;

  public readonly stage: number;

  public displayName: string;

  public readonly compilerPath: string;

  public readonly parentCompilerPath?: string;

  public readonly isChild: boolean;

  public dependencies: Array<string> | undefined;

  public reportFileName = '';

  constructor({
    name,
    displayName,
    compilerPath,
    parentCompilerPath,
    isChild,
    stage,
    controller,
    extraConfig,
    type,
  }: RsdoctorSlaveSDKOptions) {
    super({
      name,
      root: controller.root,
      config: extraConfig,
    });

    const lastSdk = controller.getLastSdk();
    const port = lastSdk
      ? lastSdk.server.port + 1
      : (extraConfig?.server?.port ?? this.server.port);

    this.id = id++;
    this.stage = typeof stage === 'number' ? stage : 1;
    this.displayName = displayName || name;
    this.compilerPath = compilerPath || '';
    this.parentCompilerPath = parentCompilerPath;
    this.isChild = Boolean(isChild);
    this.extraConfig = extraConfig;
    this.parent = controller;
    if (lastSdk) {
      this.server = new RsdoctorSlaveServer(this, port, {
        cors: extraConfig?.server?.cors,
      });
    }
    this.type = type;
    this.setName(name);
  }

  get isMaster() {
    return this.parent.master === this;
  }

  protected async writePieces(): Promise<void> {
    this.setOutputDir(this.parent.getCompilerOutputDir(this));
    await super.writePieces(this.getStoreData());
  }

  protected async writeManifest() {
    const { parent, cloudData } = this;

    if (cloudData && parent.isMultiple) {
      cloudData.name = this.name;
      cloudData.series = parent.getSeriesData();
    }

    const result = await super.writeManifest();
    await parent.refreshManifestSeries();
    return result;
  }

  async refreshManifestSeries() {
    if (!this.parent.isMultiple || !this.cloudData || !this.diskManifestPath) {
      return;
    }

    this.cloudData.name = this.name;
    this.cloudData.series = this.parent.getSeriesData();
    await super.writeManifest();
  }

  getSeriesData(serverUrl = false): Manifest.RsdoctorManifestSeriesData[] {
    return this.parent.getSeriesData(serverUrl);
  }

  setName(name: string) {
    const baseName = name || `compiler-${this.id}`;
    if (!this.parent.hasName(baseName, this)) {
      this._name = baseName;
      return;
    }

    let suffix = 2;
    while (this.parent.hasName(`${baseName}-${suffix}`, this)) {
      suffix += 1;
    }
    this._name = `${baseName}-${suffix}`;
  }

  getManifestData(): Manifest.RsdoctorManifestWithShardingFiles {
    const data = super.getManifestData();
    if (this.parent.isMultiple) {
      data.name = this.name;
      data.series = this.getSeriesData(true);
    }
    return data;
  }

  public addRsdoctorDataToHTML(
    storeData: SDK.BuilderStoreData,
    htmlContent: string,
  ) {
    const result = super.addRsdoctorDataToHTML(storeData, htmlContent);
    if (!this.parent.isMultiple) {
      return result;
    }

    const metadata = `<script>window.${Constants.WINDOW_RSDOCTOR_TAG}.name=${JSON.stringify(this.name)};window.${Constants.WINDOW_RSDOCTOR_TAG}.series=${JSON.stringify(this.parent.getBriefSeriesData(this))}</script>`;
    return result.replace('</body>', `${metadata}</body>`);
  }
}
