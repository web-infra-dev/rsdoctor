import React from 'react';
import { WebpackConfigurationViewer } from '../../../components/Configuration';
import { Card } from '../../../components/Card';
import { LoaderChart } from 'src/components/Charts';

export const Page: React.FC = () => {
  return (
    <Card title="Loader Overall" extra={<WebpackConfigurationViewer defaultKeys={['module']} />} collapsable>
      <LoaderChart />
    </Card>
  );
};

export * from './constants';
