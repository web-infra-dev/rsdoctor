import { SDK } from '@rsdoctor/types';
import { Server } from '@rsdoctor/core/build-utils';
import { RsdoctorServer } from '.';

export class RsdoctorFakeServer extends RsdoctorServer {
  constructor(
    protected sdk: SDK.RsdoctorBuilderSDKInstance,
    port = Server.defaultPort,
  ) {
    super(sdk, port);
    this.sdk = sdk;
  }

  async bootstrap() {}

  async openClientPage() {}

  dispose = async () => {};
}
