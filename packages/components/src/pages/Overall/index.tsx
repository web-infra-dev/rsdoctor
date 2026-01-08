import { SDK } from '@rsdoctor/types';
import React from 'react';
import { Flex } from 'antd';

import { HelpCenter } from '../../components/Overall/help-center';
import { BundleAlerts } from '../../components/Alerts';
import { withServerAPI } from '../../components/Manifest';
import {
  BundleOverall,
  CompileOverall,
  ProjectOverall,
} from '../../components/Overall';
import { ResponsiveLayout } from './responsiveLayout';

import style from './index.module.scss';

interface Props {
  project: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetProjectInfo>;
}

const Component: React.FC<Props> = ({ project }) => {
  const { summary, configs, root: cwd, envinfo, errors, name } = project;

  return (
    <div className={style.overall}>
      <Flex style={{ width: '100%' }}>
        <div style={{ flex: 3, marginRight: '16px', maxWidth: '75%' }}>
          <ResponsiveLayout>
            <ProjectOverall
              configs={configs}
              cwd={cwd}
              envinfo={envinfo}
              alerts={errors}
              name={name}
            />
            <BundleAlerts />
          </ResponsiveLayout>
        </div>

        <div style={{ flex: 1 }}>
          <ResponsiveLayout>
            <BundleOverall errors={errors} cwd={cwd} />
            <CompileOverall summary={summary} />
            <HelpCenter />
          </ResponsiveLayout>
        </div>
      </Flex>
    </div>
  );
};

export const Page = withServerAPI({
  api: SDK.ServerAPI.API.GetProjectInfo,
  responsePropName: 'project',
  Component,
});

export * from './constants';
