import path from 'path';
import { SDK } from '@rsdoctor/types';
import { RsdoctorSDK } from '../sdk';
import { RsdoctorSlaveServer } from './server';
import type { RsdoctorSDKController } from './controller';

let id = 1;

interface RsdoctorSlaveSDKOptions {
  name: string;
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

  public dependencies: Array<string> | undefined;

  private uploadPieces!: Promise<void>;

  private finishUploadPieceSwitch!: () => void;

  constructor({
    name,
    stage,
    controller,
    extraConfig,
    type,
  }: RsdoctorSlaveSDKOptions) {
    super({ name, root: controller.root });

    const lastSdk = controller.getLastSdk();
    const port = lastSdk ? lastSdk.server.port + 1 : this.server.port;

    this.id = id++;
    this.stage = typeof stage === 'number' ? stage : 1;
    this.extraConfig = extraConfig;
    this.parent = controller;
    this.server = new RsdoctorSlaveServer(this, port);
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

  protected async writePieces(): Promise<void> {
    const { name, parent, isMaster, outputDir, finishUploadPieceSwitch } = this;
    this.setOutputDir(
      isMaster
        ? outputDir
        : path.join(
            parent.master.outputDir,
            '.slaves',
            name.replace(/\s+/g, '-'),
          ),
    );
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

  getSeriesData(serverUrl = false) {
    return this.parent.getSeriesData(serverUrl);
  }

  setName(name: string) {
    this._name = this.parent.hasName(name) ? `${name}-${id}` : name;
  }

  getManifestData() {
    const data = super.getManifestData();
    data.name = this.name;
    data.series = this.getSeriesData(true);
    return data;
  }
}
