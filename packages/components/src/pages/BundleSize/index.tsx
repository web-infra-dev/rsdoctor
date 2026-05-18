import { Col, Row } from 'antd';
import React from 'react';

import { Size } from '../../constants';
import { BundleModulesOverall } from './components';

export const Page: React.FC = () => {
  return (
    <Row>
      <Col span={24} style={{ marginBottom: Size.BasePadding }}>
        <BundleModulesOverall />
      </Col>
    </Row>
  );
};

export * from './constants';
