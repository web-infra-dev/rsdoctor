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
      <Flex className={style.columns}>
        <main className={style.mainColumn}>
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
        </main>

        <aside className={style.sideColumn}>
          <ResponsiveLayout>
            <BundleOverall errors={errors} cwd={cwd} />
            <CompileOverall summary={summary} />
            <HelpCenter />
          </ResponsiveLayout>
        </aside>
      </Flex>
    </div>
  );
};

export const Page = Component;

export * from './constants';
