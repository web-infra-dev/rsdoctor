import React from 'react';
import { Flex } from 'antd';

import { HelpCenter } from '../../components/Overall/help-center';
import { BundleAlerts } from '../../components/Alerts';
import {
  BundleOverall,
  CompileOverall,
  ProjectOverall,
} from '../../components/Overall';
import { ResponsiveLayout } from './responsiveLayout';
import { useProjectInfo } from '../../components/Layout/project-info-context';

import style from './index.module.scss';

const Component: React.FC = () => {
  const { project } = useProjectInfo();

  if (!project) {
    return null;
  }

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

export const Page = Component;

export * from './constants';
