import { Server } from '@rsdoctor/utils/build';
import { RsdoctorServer } from '../server';
import type { RsdoctorSlaveSDK } from './slave';

export class RsdoctorSlaveServer extends RsdoctorServer {
  protected sdk: RsdoctorSlaveSDK;

  constructor(sdk: RsdoctorSlaveSDK, port = Server.defaultPort) {
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
