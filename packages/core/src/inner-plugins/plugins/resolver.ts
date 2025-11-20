import { Manifest, Plugin, SDK } from '@rsdoctor/types';
import { Time } from '@rsdoctor/utils/common';
import { InternalBasePlugin } from './base';
import type { Compiler as WebpackCompiler } from 'webpack';

export class InternalResolverPlugin<
  T extends Plugin.BaseCompiler,
> extends InternalBasePlugin<T> {
  public readonly name = 'resolver';

  protected resolveDataMap = new Map<
    string,
    { startAt: number; startHRTime: [number, number]; request: string }
  >();

  public apply(compiler: T) {
    // resolver depends on module graph
    this.scheduler.ensureModulesChunksGraphApplied(compiler);
    compiler.hooks.normalModuleFactory.tap(
      this.tapPostOptions,
      this.handleNormalModuleFactory,
    );

    // add resolver page to client
    this.sdk.addClientRoutes([
      Manifest.RsdoctorManifestClientRoutes.ModuleResolve,
    ]);
  }

  protected handleNormalModuleFactory = (
    normalModuleFactory:
      | Plugin.RspackNormalModuleFactory
      | ReturnType<WebpackCompiler['createNormalModuleFactory']>,
  ) => {
    // Hook into beforeResolve to capture the start time
    normalModuleFactory.hooks.beforeResolve.tap(
      this.tapPostOptions,
      (resolveData: any) => {
        if (!resolveData) return;

        const issuer =
          resolveData.contextInfo?.issuer || resolveData.context || '';
        const request = resolveData.request;

        if (issuer && request) {
          const key = `${issuer}::${request}`;
          this.resolveDataMap.set(key, {
            startAt: Date.now(),
            startHRTime: process.hrtime(),
            request,
          });
        }
      },
    );

    // Hook into afterResolve to capture the result and report
    normalModuleFactory.hooks.afterResolve.tap(
      this.tapPostOptions,
      (resolveData: any) => {
        if (!resolveData) return;

        const issuer =
          resolveData.contextInfo?.issuer || resolveData.context || '';
        const request = resolveData.request;
        const result =
          resolveData.createData?.resource ||
          resolveData.resourceResolveData?.path;

        if (issuer && request) {
          const key = `${issuer}::${request}`;
          const startData = this.resolveDataMap.get(key);

          if (startData) {
            const data: SDK.PathResolverSuccessData = {
              isEntry: Boolean(issuer),
              issuerPath: issuer,
              request: startData.request,
              startAt: startData.startAt,
              endAt: Time.getCurrentTimestamp(
                startData.startAt,
                startData.startHRTime,
              ),
              result: result || '',
              pid: process.pid,
              ppid: process.ppid,
            };

            this.sdk.reportResolver([data]);
            this.resolveDataMap.delete(key);
          }
        }
      },
    );
  };
}
