import { Card, Empty } from 'antd';
import React from 'react';
import { Client } from '@rsdoctor/shared/types';
import { Link } from 'react-router-dom';

export function Space(): React.ReactElement {
  return (
    <Card
      title="Tree Shaking Analysis"
      bodyStyle={{ paddingTop: 0 }}
      className="tree-shaking-page"
    >
      <Empty
        style={{ marginTop: 30 }}
        description="This report does not contain the export analysis data required by this page."
      >
        <Link to={Client.RsdoctorClientRoutes.BundleSize}>
          Open Bundle Size to inspect module details and available side effects
        </Link>
      </Empty>
    </Card>
  );
}
