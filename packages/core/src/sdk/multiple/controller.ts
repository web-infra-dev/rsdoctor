import { Manifest } from '@rsdoctor/types';
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

  hasName(name: string) {
    return Boolean(this.slaves.find((item) => item.name === name));
  }

  getSeriesData(serverUrl = false) {
    return this.slaves.map((item) => {
      const data: Manifest.RsdoctorManifestSeriesData = {
        name: item.name,
        path: item.diskManifestPath,
        stage: item.stage,
      };

      if (serverUrl) {
        data.origin = item.server.origin;
      }

      return data;
    });
  }

  createSlave({
    name,
    stage,
    extraConfig,
    type,
  }: Omit<ConstructorParameters<typeof RsdoctorPrimarySDK>[0], 'controller'>) {
    const slave = new RsdoctorPrimarySDK({
      name,
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
