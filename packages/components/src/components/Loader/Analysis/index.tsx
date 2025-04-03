import { SDK } from '@rsdoctor/types';
import { ConfigProvider } from 'antd';
import React, { useState } from 'react';
import { ConfigContext } from 'src/config';
import { getLocale } from 'src/utils';
import { ServerAPIProvider, withServerAPI } from '../../Manifest';
import { ISelectLoaderProps, LoaderCommonSelect } from '../../Select';
import { LoaderFiles } from './files';
import styles from './style.module.scss';

export const LoaderAnalysisBase: React.FC<{
  cwd: string;
}> = ({ cwd }) => {
  const [store, setStore] = useState({
    filename: '',
    loaders: [] as string[],
    layer: '',
  } as ISelectLoaderProps);

  return (
    <ConfigContext.Consumer>
      {(v) => {
        return (
          <ConfigProvider
            locale={getLocale(v.locale)}
            theme={{
              token: {
                padding: 16,
                fontSize: 14,
              },
            }}
          >
            <div className={styles.loaderAnalysis}>
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
          </ConfigProvider>
        );
      }}
    </ConfigContext.Consumer>
  );
};

export const LoaderAnalysis = withServerAPI({
  api: SDK.ServerAPI.API.LoadDataByKey,
  body: { key: 'root' },
  responsePropName: 'cwd',
  Component: LoaderAnalysisBase,
});
