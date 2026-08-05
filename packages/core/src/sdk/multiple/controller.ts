import { Constants, Manifest } from '@rsdoctor/shared/types';
import path from 'node:path';
import { RsdoctorPrimarySDK } from './primary';

export class RsdoctorSDKController {
  readonly slaves: RsdoctorPrimarySDK[] = [];

  public root = '';

  constructor(root = process.cwd()) {
    this.root = root;
  }

  get master() {
    return this.slaves[0];
  }

  getLastSdk() {
    return this.slaves[this.slaves.length - 1];
  }

  hasName(name: string, current?: RsdoctorPrimarySDK) {
    return Boolean(
      this.slaves.find((item) => item !== current && item.name === name),
    );
  }

  getSeriesData(serverUrl = false) {
    return this.slaves.map((item) => {
      const data: Manifest.RsdoctorManifestSeriesData = {
        name: item.name,
        displayName: item.displayName,
        path:
          item.diskManifestPath ||
          path.resolve(item.outputDir, Constants.RsdoctorOutputManifest),
        stage: item.stage,
        compilerPath: item.compilerPath,
        parentCompilerPath: item.parentCompilerPath,
        isChild: item.isChild,
      };

      if (serverUrl) {
        data.origin = item.server.origin;
      }

      return data;
    });
  }

  createSlave({
    name,
    displayName,
    compilerPath,
    parentCompilerPath,
    isChild,
    stage,
    extraConfig,
    type,
  }: Omit<ConstructorParameters<typeof RsdoctorPrimarySDK>[0], 'controller'>) {
    const slave = new RsdoctorPrimarySDK({
      name,
      displayName,
      compilerPath,
      parentCompilerPath,
      isChild,
      stage,
      controller: this,
      extraConfig,
      type,
    });
    this.slaves.push(slave);
    // sort by stage after create slave sdk.
    this.slaves.sort((a, b) => a.stage - b.stage);
    return slave;
  }
}
