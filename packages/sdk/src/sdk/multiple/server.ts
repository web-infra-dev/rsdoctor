import { Server } from '@rsdoctor/utils/build';
import { RsdoctorServer } from '../server';
import type { RsdoctorPrimarySDK } from './primary';

export class RsdoctorSlaveServer extends RsdoctorServer {
  protected sdk: RsdoctorPrimarySDK;

  constructor(sdk: RsdoctorPrimarySDK, port = Server.defaultPort) {
    super(sdk, port);
    this.sdk = sdk;
  }

  async openClientPage(...args: unknown[]) {
    if (this.sdk.isMaster) {
      return super.openClientPage(...(args as ['homepage']));
    }

    return Promise.resolve();
  }
}
