import { SDK } from '@rsdoctor/types';
import { Server } from '@rsdoctor/utils/build';
import { DoctorServer } from '.';

export class DoctorFakeServer extends DoctorServer {
  constructor(
    protected sdk: SDK.DoctorBuilderSDKInstance,
    port = Server.defaultPort,
  ) {
    super(sdk, port);
    this.sdk = sdk;
  }

  async openClientPage() {}
}
