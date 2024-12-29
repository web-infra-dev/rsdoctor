import React from 'react';
import { LoaderAnalysis } from '../../../components/Loader/Analysis';
import { WebpackConfigurationViewer } from '../../../components/Configuration';
import { Card } from '../../../components/Card';
import { theme } from 'antd';
const { useToken } = theme;

export const Page: React.FC = () => {
  const { token } = useToken();

  return (
    <Card
      title="Loader Analysis"
      extra={<WebpackConfigurationViewer defaultKeys={['module', 'resolve']} />}
      bodyStyle={{ paddingTop: token.padding, height: 800 }}
    >
      <LoaderAnalysis />
    </Card>
  );
};

export * from './constants';
