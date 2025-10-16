import { Build } from '@/build-utils';
import { getSDK } from '@/inner-plugins';
import { Plugin, SDK } from '@rsdoctor/types';
import type { LoaderDefinitionFunction } from '@rspack/core';
import { omit } from 'es-toolkit/compat';
import path from 'path';

export const loaderModule: Plugin.LoaderDefinition<
  Parameters<LoaderDefinitionFunction>,
  {}
> = function (...args) {
  const time = Date.now();
  const code = args[0];
  const _options = this.getOptions() as unknown as {
    loader: string;
    options: Record<string, any>;
    type: 'start' | 'end';
    builderName: string;
  };
  const sdk = getSDK(_options.builderName);

  const loaderData: SDK.ResourceLoaderData = {
    resource: {
      path: this._module?.layer
        ? `${this.resourcePath}[${this._module.layer}]`
        : this.resourcePath,
      query: Build.Utils.parseQuery(this.resourceQuery),
      queryRaw: this.resourceQuery,
      ext: path.extname(this.resourcePath).slice(1),
      ...(this._module?.layer ? { layer: this._module.layer } : {}),
    },
    loaders: [
      {
        loader: _options.loader,
        loaderIndex: this.loaderIndex,
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
