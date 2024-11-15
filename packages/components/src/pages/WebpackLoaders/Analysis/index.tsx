import React from 'react';
import { LoaderAnalysis } from '../../../components/Loader/Analysis';
import { WebpackConfigurationViewer } from '../../../components/Configuration';
import { Card } from '../../../components/Card';

export const Page: React.FC = () => {
  return (
    <Card
      title="Loader Analysis"
      extra={<WebpackConfigurationViewer defaultKeys={['module', 'resolve']} />}
      bodyStyle={{ paddingTop: 0, height: 800 }}
    >
      <LoaderAnalysis />
    </Card>
  );
};

export * from './constants';
