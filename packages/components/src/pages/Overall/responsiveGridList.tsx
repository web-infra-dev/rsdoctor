import { Col, Grid, Row } from 'antd';
import React, { useMemo } from 'react';
import { Size } from '../../constants';

interface Props {
  children: React.ReactNode[];
}

export const ResponsiveGridLayout = ({ children }: Props) => {
  const { sm, xxl } = Grid.useBreakpoint();

  const gutters = useMemo<[number, number]>(() => {
    if (xxl) {
      return [Size.BasePadding * 2, Size.BasePadding];
    } else {
      return [Size.BasePadding, Size.BasePadding];
    }
  }, [sm, xxl]);

  return (
    <Row
      gutter={gutters}
      wrap
      style={{
        marginBottom: Size.BasePadding,
      }}
    >
      {children.map((e, i) => (
        <Col key={i} xs={24} sm={24} md={12} lg={8}>
          {e}
        </Col>
      ))}
    </Row>
  );
};
