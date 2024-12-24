import { Col, Row } from 'antd';
import React from 'react';

import style from './index.module.scss';

interface Props {
  children: React.ReactNode[];
}

export const ResponsiveLayout = ({ children }: Props) => {
  return (
    <Col className={style.layout}>
      {children.map((e, i) => (
        <Row className={style.row} key={i} wrap>
          {e}
        </Row>
      ))}
    </Col>
  );
};
