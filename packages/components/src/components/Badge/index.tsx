import { Tooltip } from 'antd';
import React from 'react';

export enum BadgeType {
  Default = 'default',
  Success = 'success',
  Warn = 'warn',
  Error = 'error',
}

export const BadgeColorMap = {
  [BadgeType.Default]: 'linear-gradient(to bottom, #3ea2ff 0%, #0072db 100%)',
  [BadgeType.Success]: 'linear-gradient(to bottom, #6cf42a 0%, #52C41A 100%)',
  [BadgeType.Warn]: 'linear-gradient(to bottom, #ffc100 0%, #f59025 100%)',
  [BadgeType.Error]: `linear-gradient(to bottom, rgb(250 127 22), #FF4D4F 100%)`,
};

interface BadgeProps {
  label: string | number | React.ReactNode;
  value: string | number | React.ReactNode;
  type?: BadgeType | `${BadgeType}`;
  tooltip?: true | string | React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ label, value, type = 'default', tooltip }) => {
  const height = 22;

  const borderRadius = 4;

  const commonStyle: React.CSSProperties = {
    height: '100%',
    lineHeight: `${height}px`,
    width: 'auto',
    display: 'inline-block',
    boxSizing: 'border-box',
    padding: `0 6px`,
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    verticalAlign: 'middle',
  };

  const Content = (
    <div
      style={{
        height,
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
        borderRadius: 4,
        fontSize: 0,
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          ...commonStyle,
          borderTopLeftRadius: borderRadius,
          borderBottomLeftRadius: borderRadius,
          background: 'linear-gradient(to bottom, #525252a3 0%, #1F1F1F 100%)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          ...commonStyle,
          borderTopRightRadius: borderRadius,
          borderBottomRightRadius: borderRadius,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          background: BadgeColorMap[type] || BadgeColorMap[BadgeType.Default],
        }}
      >
        {value}
      </div>
    </div>
  );

  if (tooltip) {
    return (
      <Tooltip title={tooltip === true ? value : tooltip} placement="topLeft">
        {Content}
      </Tooltip>
    );
  }

  return Content;
};
