import { SDK } from '@rsdoctor/types';
import React from 'react';
import { BundleAlerts, CompileAlerts } from '../../components/Alerts';
import { withServerAPI } from '../../components/Manifest';
import {
  BundleOverall,
  CompileOverall,
  ProjectOverall,
} from '../../components/Overall';
import { ResponsiveGridLayout } from './responsiveGridList';

interface Props {
  project: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetProjectInfo>;
}

const Component: React.FC<Props> = ({ project }) => {
  const { summary, configs, root: cwd, envinfo, errors } = project;

  return (
    <div>
      <ResponsiveGridLayout>
        <ProjectOverall
          configs={configs}
          cwd={cwd}
          envinfo={envinfo}
          alerts={errors}
        />
        <BundleOverall errors={errors} cwd={cwd} />
        <CompileOverall summary={summary} />
      </ResponsiveGridLayout>

      <CompileAlerts />

      <BundleAlerts />
    </div>
  );
};

export const Page = withServerAPI({
  api: SDK.ServerAPI.API.GetProjectInfo,
  responsePropName: 'project',
  Component,
});

export * from './constants';
