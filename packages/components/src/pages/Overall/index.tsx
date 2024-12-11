import { SDK } from '@rsdoctor/types';
import React from 'react';
import { BundleAlerts, CompileAlerts } from '../../components/Alerts';
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
  const { summary, configs, root: cwd, envinfo, errors } = project;

  return (
    <div className={style.overall}>
      <ResponsiveLayout>
        <ProjectOverall
          configs={configs}
          cwd={cwd}
          envinfo={envinfo}
          alerts={errors}
        />
        <BundleAlerts />
      </ResponsiveLayout>

      <ResponsiveLayout>
        <BundleOverall errors={errors} cwd={cwd} />
        <CompileOverall summary={summary} />
        {/* TODO Change this component */}
        <CompileAlerts />
      </ResponsiveLayout>
    </div>
  );
};

export const Page = withServerAPI({
  api: SDK.ServerAPI.API.GetProjectInfo,
  responsePropName: 'project',
  Component,
});

export * from './constants';
