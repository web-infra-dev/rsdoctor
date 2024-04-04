import { getSDK } from '@rsdoctor/core/plugins';
import { Plugin, SDK } from '@rsdoctor/types';
import type { LoaderDefinitionFunction } from '@rspack/core';
import { parseQuery } from 'loader-utils';
import { omit } from 'lodash';
import path from 'path';

const loaderModule: Plugin.LoaderDefinition<
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
      path: this.resourcePath,
      query: parseQuery(this.resourceQuery || '?'),
      queryRaw: this.resourceQuery,
      ext: path.extname(this.resourcePath).slice(1),
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

  sdk.reportLoaderStartOrEnd(loaderData);
  this.callback(null, ...args);
};

export default loaderModule;
