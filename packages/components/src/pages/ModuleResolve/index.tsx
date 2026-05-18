import React from 'react';
import { Card } from 'antd';
import { ResolverAnalysis } from '../../components/Resolver/analysis';
import { BundlerConfigurationViewer } from '../../components/Configuration';

export const Page: React.FC = () => {
  return (
    <div>
      <Card
        title="Resolver Analysis"
        extra={
          <BundlerConfigurationViewer
            defaultKeys={['resolve', 'resolveLoader']}
          />
        }
        bodyStyle={{ paddingTop: 0 }}
      >
        <ResolverAnalysis />
      </Card>
    </div>
  );
};

export * from './constants';
