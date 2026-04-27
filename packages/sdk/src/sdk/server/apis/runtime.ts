import { SDK } from '@rsdoctor/types';
import { BaseAPI } from './base';
import { Router } from '../router';

export class RuntimeAPI extends BaseAPI {
  @Router.post(SDK.ServerAPI.API.ReportWebVitals)
  async reportVitals() {
    const { req, sdk } = this.ctx;
    const body = req.body as Record<string, unknown> | undefined;

    if (!body || Object.keys(body).length === 0) {
      return 'ok';
    }

    if (body.name && body.value !== undefined) {
      (sdk as SDK.RsdoctorBuilderSDKInstance).reportWebVital(
        body as unknown as SDK.WebVitalMetric,
      );
    }

    return 'ok';
  }

  @Router.get(SDK.ServerAPI.API.GetWebVitals)
  async getVitals() {
    const { sdk } = this.ctx;
    return (sdk as SDK.RsdoctorBuilderSDKInstance).getRuntimePerfData();
  }

  @Router.post(SDK.ServerAPI.API.ReportResourceTimings)
  async reportResourceTimings() {
    const { req, sdk } = this.ctx;
    const body = req.body as unknown;

    if (!body || !Array.isArray(body) || body.length === 0) {
      return 'ok';
    }

    (sdk as SDK.RsdoctorBuilderSDKInstance).reportResourceTimings(
      body as SDK.ResourceTimingData[],
    );

    return 'ok';
  }

  @Router.get(SDK.ServerAPI.API.GetResourceTimings)
  async getResourceTimings() {
    const { sdk } = this.ctx;
    return (
      (sdk as SDK.RsdoctorBuilderSDKInstance).getRuntimePerfData()
        .resourceTimings || []
    );
  }
}
