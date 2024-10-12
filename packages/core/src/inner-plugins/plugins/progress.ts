import { SDK } from '@rsdoctor/types';
import type { Plugin } from '@rsdoctor/types';
import { InternalBasePlugin } from './base';
import { debug } from '@rsdoctor/utils/logger';

export class InternalProgressPlugin<
  T extends Plugin.BaseCompilerType<'webpack'>,
> extends InternalBasePlugin<T> {
  public readonly name = 'progress';

  protected currentProgress: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.APIExtends.GetCompileProgress> =
    {
      percentage: 100,
      message: '',
    };

  public apply(compiler: T): void {
    const { sdk, currentProgress } = this;
    if (compiler.webpack && compiler.webpack.ProgressPlugin) {
      const progress = new compiler.webpack.ProgressPlugin({
        handler(percentage: number, msg: string) {
          currentProgress.percentage = percentage;
          currentProgress.message = msg || '';

          const api = SDK.ServerAPI.APIExtends.GetCompileProgress;
          try {
            sdk.server.sendAPIDataToClient(api, {
              req: {
                api,
                body: undefined,
              },
              res: currentProgress,
            });
          } catch (e: any) {
            debug(() => e);
          }
        },
      });
      progress.apply(compiler);
    }
  }
}
