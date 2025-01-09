import React, { useState, CSSProperties } from 'react';
import { CaretRightOutlined, CaretDownOutlined } from '@ant-design/icons';
import { Card as C, CardProps as CProps, Space } from 'antd';
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
        style={{ borderRadius: '12px' }}
        {...rest}
        title={
          <Space style={{ fontSize: 'inherit' }}>
            <div
              style={{ cursor: 'pointer' }}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <CaretRightOutlined /> : <CaretDownOutlined />}
            </div>
            {title}
          </Space>
        }
      >
        {collapsed ? null : children}
      </C>
    );
  }
  return (
    <C style={{ borderRadius: '12px' }} title={title} {...rest}>
      {children}
    </C>
  );
};
