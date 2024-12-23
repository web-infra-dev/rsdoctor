import { SDK } from '@rsdoctor/types';
import React from 'react';

import { HelpCenter } from '../../components/Overall/help-center';
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

const helpCenterData = [
  {
    title: 'FAQ',
    link: 'https://rsdoctor.dev/guide/more/faq',
  },
  {
    title: 'Introduction',
    link: 'https://rsdoctor.dev/guide/start/intro',
  },
  {
    title: 'Bundle Alerts',
    link: 'https://rsdoctor.dev/guide/usage/bundle-alerts',
  },
  {
    title: 'Bundle Overall',
    link: 'https://rsdoctor.dev/guide/usage/bundle-overall',
  },
  {
    title: 'Bundle Analysis',
    link: 'https://rsdoctor.dev/guide/usage/bundle-size',
  },
  {
    title: 'Compilation Alerts',
    link: 'https://rsdoctor.dev/guide/usage/compile-alerts',
  },
  {
    title: 'Compile Overall',
    link: 'https://rsdoctor.dev/guide/usage/compile-overall',
  },
  {
    title: 'Loaders Analysis',
    link: 'https://rsdoctor.dev/guide/usage/loaders-analysis',
  },
  {
    title: 'Loaders Timeline',
    link: 'https://rsdoctor.dev/guide/usage/loaders-timeline',
  },
  {
    title: 'Plugin Analysis',
    link: 'https://rsdoctor.dev/guide/usage/plugins-analysis',
  },
];
const Component: React.FC<Props> = ({ project }) => {
  const { summary, configs, root: cwd, envinfo, errors } = project;

  return (
    <div className={style.overall}>
      <div>
        <ResponsiveLayout>
          <ProjectOverall
            configs={configs}
            cwd={cwd}
            envinfo={envinfo}
            alerts={errors}
          />
          <BundleAlerts />
        </ResponsiveLayout>
      </div>

      <div>
        <ResponsiveLayout>
          <BundleOverall errors={errors} cwd={cwd} />
          <CompileOverall summary={summary} />
          <HelpCenter data={helpCenterData} />
        </ResponsiveLayout>
      </div>
    </div>
  );
};

export const Page = withServerAPI({
  api: SDK.ServerAPI.API.GetProjectInfo,
  responsePropName: 'project',
  Component,
});

export * from './constants';
