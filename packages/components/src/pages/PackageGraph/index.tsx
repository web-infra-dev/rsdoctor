import React from 'react';
import { Card, Col, Row, Skeleton, Typography } from 'antd';
import { SDK } from '@rsdoctor/types';
import { ServerAPIProvider } from 'src/components/Manifest';
import { Size } from '../../constants';
import { GraphView } from './components';

export * from './constants';

const PackageGraphPage: React.FC = () => {
  return (
    <Row>
      <Col span={24} style={{ marginBottom: Size.BasePadding }}>
        <Card
          title={
            <Typography.Title level={5} style={{ margin: 0 }}>
              Package Dependency Graph
            </Typography.Title>
          }
          styles={{ body: { padding: '16px 20px' } }}
        >
          <ServerAPIProvider
            api={SDK.ServerAPI.API.GetPackageInfo}
            fallbackComponent={() => <Skeleton active />}
          >
            {(packages) => (
              <ServerAPIProvider
                api={SDK.ServerAPI.API.GetPackageDependency}
                body={{ packageId: '' }}
                fallbackComponent={() => <Skeleton active />}
              >
                {(deps) => (
                  <GraphView packages={packages} dependencies={deps} />
                )}
              </ServerAPIProvider>
            )}
          </ServerAPIProvider>
        </Card>
      </Col>
    </Row>
  );
};

export const Page = PackageGraphPage;
