import React from 'react';
import { Card } from 'antd';
import { ResolverAnalysis } from '../../components/Resolver/analysis';
import { WebpackConfigurationViewer } from '../../components/Configuration';

export const Page: React.FC = () => {
  return (
    <div>
      <Card
        title="Webpack Resolver Analysis"
        extra={<WebpackConfigurationViewer defaultKeys={['resolve', 'resolveLoader']} />}
        bodyStyle={{ paddingTop: 0 }}
      >
        <ResolverAnalysis />
      </Card>
    </div>
  );
};

export * from './constants';
