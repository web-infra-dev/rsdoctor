import React, { useState } from 'react';
import { SDK } from '@rsdoctor/types';
import { ServerAPIProvider, withServerAPI } from '../../Manifest';
import { LoaderFiles } from './files';
import { ISelectLoaderProps, LoaderCommonSelect } from '../../Select';

export const LoaderAnalysisBase: React.FC<{
  cwd: string;
}> = ({ cwd }) => {
  const [store, setStore] = useState({
    filename: '',
    loaders: [] as string[],
    layer: '',
  } as ISelectLoaderProps);

  return (
    <div>
      <ServerAPIProvider api={SDK.ServerAPI.API.GetLoaderNames}>
        {(loaderNames) => (
          <LoaderCommonSelect
            onChange={(e) => setStore(e)}
            loaderNames={loaderNames}
          />
        )}
      </ServerAPIProvider>
      <ServerAPIProvider api={SDK.ServerAPI.API.GetLoaderFileTree}>
        {(filetree) => (
          <LoaderFiles
            filename={store.filename}
            filetree={filetree}
            loaders={store.loaders}
            layer={store.layer}
            cwd={cwd}
          />
        )}
      </ServerAPIProvider>
    </div>
  );
};

export const LoaderAnalysis = withServerAPI({
  api: SDK.ServerAPI.API.LoadDataByKey,
  body: { key: 'root' },
  responsePropName: 'cwd',
  Component: LoaderAnalysisBase,
});
