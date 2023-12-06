import React from 'react';
import { Typography } from 'antd';
import { TextProps } from 'antd/es/typography/Text';

export const Keyword: React.FC<TextProps & { text: string; keyword: string }> = ({ text, keyword, ...rest }) => {
  if (!keyword) {
    return <Typography.Text {...rest}>{text}</Typography.Text>;
  }

  const idx = text.indexOf(keyword);
  if (idx === -1) {
    return <Typography.Text {...rest}>{text}</Typography.Text>;
  }

  const els: (string | React.ReactNode)[] = [];

  let str = text;

  while (str.length > 0) {
    const idx = str.indexOf(keyword);
    if (idx > -1) {
      if (idx !== 0) {
        els.push(
          <Typography.Text key={els.length} style={{ fontSize: 'inherit' }}>
            {str.slice(0, idx)}
          </Typography.Text>,
        );
      }
      els.push(
        <Typography.Text mark key={els.length} style={{ fontSize: 'inherit' }}>
          {keyword}
        </Typography.Text>,
      );
      str = str.slice(idx + keyword.length);
    } else {
      els.push(
        <Typography.Text key={els.length} style={{ fontSize: 'inherit' }}>
          {str}
        </Typography.Text>,
      );
      break;
    }
  }

  return <Typography.Text {...rest}>{els}</Typography.Text>;
};
