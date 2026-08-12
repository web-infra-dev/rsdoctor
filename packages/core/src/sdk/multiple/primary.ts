import path from 'path';
import { Manifest, SDK } from '@rsdoctor/shared/types';
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

  public readonly displayName: string;

  public readonly compilerPath: string;

  public readonly parentCompilerPath?: string;

  public readonly isChild: boolean;

  public dependencies: Array<string> | undefined;

  private uploadPieces!: Promise<void>;

  private finishUploadPieceSwitch!: () => void;

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
    this.server = new RsdoctorSlaveServer(this, port, {
      cors: extraConfig?.server?.cors,
    });
    this.type = type;
    this.setName(name);
    this.clearSwitch();
  }

  private clearSwitch() {
    this.uploadPieces = new Promise<void>((resolve) => {
      this.finishUploadPieceSwitch = resolve;
    });
  }

  get isMaster() {
    return this.parent.master === this;
  }

  private ensureSlaveOutputDir() {
    if (this.isMaster) {
      return;
    }

    this.setOutputDir(
      path.join(
        this.parent.master.outputDir,
        '.slaves',
        this.name.replace(/\s+/g, '-'),
      ),
    );
  }

  public async writeStore(options?: SDK.WriteStoreOptionsType) {
    this.ensureSlaveOutputDir();
    return super.writeStore(options);
  }

  protected async writePieces(): Promise<void> {
    const { finishUploadPieceSwitch } = this;
    this.ensureSlaveOutputDir();
    await super.writePieces(this.getStoreData());
    finishUploadPieceSwitch?.();
  }

  protected async writeManifest() {
    const { parent, cloudData, dependencies } = this;

    if (!dependencies?.length) {
      await Promise.all(
        this.parent.slaves
          .filter((item) => !item.dependencies?.length)
          .map((item) => item.uploadPieces),
      );
    }

    if (cloudData) {
      cloudData.name = this.name;
      cloudData.series = parent.getSeriesData();
    }

    const result = await super.writeManifest();
    this.clearSwitch();
    return result;
  }

  getSeriesData(serverUrl = false): Manifest.RsdoctorManifestSeriesData[] {
    return this.parent.getSeriesData(serverUrl);
  }

  setName(name: string) {
    this._name = this.parent.hasName(name, this) ? `${name}-${id}` : name;
  }

  getManifestData(): Manifest.RsdoctorManifestWithShardingFiles {
    const data = super.getManifestData();
    data.name = this.name;
    data.series = this.getSeriesData(true);
    return data;
  }
}
