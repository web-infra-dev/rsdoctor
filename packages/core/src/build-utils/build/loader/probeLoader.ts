import { parseQuery } from '@/build-utils/build/utils';
import { getSDK } from '@/inner-plugins/utils/sdk';
import type { Plugin, SDK } from '@rsdoctor/shared/types';
import { omit } from '@rsdoctor/shared/collection';
import path from 'path';

export interface ProbeLoaderOptions {
  loader: string;
  options: Record<string, any>;
  type: 'start' | 'end';
  builderName: string;
}

const loaderModule: Plugin.LoaderDefinition<ProbeLoaderOptions, object> =
  function (...args) {
    const time = Date.now();
    const code = args[0];
    const _options = this.getOptions();
    const compilation = this._compilation as
      { compiler?: { compilerPath?: string } } | undefined;
    const sdk = getSDK(
      compilation?.compiler?.compilerPath || _options.builderName,
    );
    const targetLoaderIndex =
      _options.type === 'start' ? this.loaderIndex - 1 : this.loaderIndex + 1;

    const loaderData: SDK.ResourceLoaderData = {
      resource: {
        path: this._module?.layer
          ? `${this.resourcePath}[${this._module.layer}]`
          : this.resourcePath,
        query: parseQuery(this.resourceQuery),
        queryRaw: this.resourceQuery,
        ext: path.extname(this.resourcePath).slice(1),
        ...(this._module?.layer ? { layer: this._module.layer } : {}),
      },
      loaders: [
        {
          loader: _options.loader,
          loaderIndex: targetLoaderIndex,
          path: _options.loader,
          input: _options.type === 'start' ? code : null,
          result: _options.type === 'end' ? code : null,
          startAt: _options.type === 'start' ? time : 0,
          endAt: _options.type === 'end' ? time : 0,
          options: omit(_options.options, 'type'),
          isPitch: false,
          sync: false,
          errors: [],
          pid: process.pid,
          ppid: process.ppid,
        },
      ],
    };

    sdk?.reportLoaderStartOrEnd(loaderData);
    this.callback(null, ...args);
  };

export default loaderModule;
