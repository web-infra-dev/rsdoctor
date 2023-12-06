import { Col, Row } from 'antd';
import React from 'react';

import { Size } from '../../constants';
import { WebpackModulesOverall } from './components';

export const Page: React.FC = () => {
  return (
    <Row>
      <Col span={24} style={{ marginBottom: Size.BasePadding }}>
        <WebpackModulesOverall />
      </Col>
    </Row>
  );
};

export * from './constants';
