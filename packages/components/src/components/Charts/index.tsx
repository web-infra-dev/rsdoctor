import React, { useState } from 'react';
import { Space } from 'antd';
import { SDK } from '@rsdoctor/types';

import { ISelectLoaderProps, LoaderCommonSelect } from '../Select';
import { ServerAPIProvider, withServerAPI } from '../Manifest';
import { LoaderExecutionsChart } from './loader';
import { filterLoader } from 'src/utils/loader';

enum ChartDimension {
  Loader,
  Process,
}

export const LoaderChartBase: React.FC<{
  project: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetProjectInfo>;
}> = ({ project }) => {
  const { root: cwd } = project;
  const [store, setStore] = useState({
    filename: '',
    loaders: [] as string[],
    layer: '',
  } as ISelectLoaderProps);
  // @ts-ignore
  const [dimension, setDimension] = useState<ChartDimension>(
    ChartDimension.Loader,
  );

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {/* <Radio.Group TODO:: process dimension
          options={[
            {
              label: 'Loader Dimension',
              value: ChartDimension.Loader,
            },
            {
              label: 'Process Dimension',
              value: ChartDimension.Process,
            },
          ]}
          onChange={(e) => setDimension(e.target.value)}
          value={dimension}
          optionType="button"
          buttonStyle="solid"
          size="middle"
          style={{ marginRight: Size.BasePadding - 8 }}
        /> */}
      <ServerAPIProvider api={SDK.ServerAPI.API.GetLoaderNames}>
        {(loaderNames) => (
          <LoaderCommonSelect onChange={setStore} loaderNames={loaderNames} />
        )}
      </ServerAPIProvider>
      <ServerAPIProvider api={SDK.ServerAPI.API.GetLoaderChartData}>
        {(res) => {
          const loaders = res.filter((el) =>
            filterLoader(
              el.resource,
              el.loader,
              store.filename,
              store.loaders,
              el.layer,
              store?.layer,
            ),
          );
          return dimension === ChartDimension.Loader ? (
            <LoaderExecutionsChart loaders={loaders} cwd={cwd} />
          ) : (
            // <ProcessExecutionsChart loaders={loaders} cwd={cwd} pid={pid} />
            <></>
          );
        }}
      </ServerAPIProvider>
    </Space>
  );
};

export const LoaderChart = withServerAPI({
  api: SDK.ServerAPI.API.GetProjectInfo,
  responsePropName: 'project',
  Component: LoaderChartBase,
});
