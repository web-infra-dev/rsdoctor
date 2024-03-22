import {
  ColumnHeightOutlined,
  VerticalAlignMiddleOutlined,
} from '@ant-design/icons';
import { Card as C, CardProps as CProps, Space, Button, Divider } from 'antd';
import React, { useState, CSSProperties } from 'react';
export * from './diff';
export interface CardProps extends CProps {
  collapsable?: boolean;
  dividerStyle?: CSSProperties;
  defaultCollapsed?: boolean;
}

export const Card: React.FC<CardProps> = ({
  collapsable = false,
  children,
  title,
  dividerStyle,
  defaultCollapsed = false,
  ...rest
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  if (title && collapsable) {
    return (
      <C
        {...rest}
        title={
          <Space style={{ fontSize: 'inherit' }}>
            <Button
              icon={
                collapsed ? (
                  <ColumnHeightOutlined />
                ) : (
                  <VerticalAlignMiddleOutlined />
                )
              }
              onClick={() => setCollapsed(!collapsed)}
              size="small"
            />
            {title}
          </Space>
        }
      >
        {collapsed ? (
          <Divider orientation="center" style={dividerStyle} plain>
            <Button
              icon={<ColumnHeightOutlined />}
              type="text"
              onClick={() => setCollapsed(!collapsed)}
            >
              show more
            </Button>
          </Divider>
        ) : (
          children
        )}
      </C>
    );
  }
  return (
    <C title={title} {...rest}>
      {children}
    </C>
  );
};
