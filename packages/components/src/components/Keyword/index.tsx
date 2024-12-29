import React, { type ReactNode } from 'react';
import { Popover, Typography } from 'antd';
import { TextProps } from 'antd/es/typography/Text';
import styles from './style.module.scss';

const MAX_LENGTH = 40;

export const Keyword: React.FC<
  TextProps & { text: string; keyword: string }
> = ({ text, keyword, ...rest }) => {
  if (!keyword) {
    return EllipsisText({ text, rest });
  }

  const idx = text.indexOf(keyword);

  if (idx === -1) {
    return EllipsisText({ text, rest });
  }

  const els: (string | React.ReactNode)[] = [];

  let str = text;

  while (str.length > 0) {
    const idx = str.indexOf(keyword);
    if (idx > -1) {
      if (idx !== 0) {
        els.push(EllipsisText({ text: str, els }));
      }
      els.push(EllipsisText({ text: str, els, marked: true }));
      str = str.slice(idx + keyword.length);
    } else {
      els.push(EllipsisText({ text: str, els, marked: true }));
      break;
    }
  }

  return <Typography.Text {...rest}>{els}</Typography.Text>;
};

const EllipsisText = ({
  text,
  els,
  marked = false,
  rest,
}: {
  text: string;
  els?: ReactNode[];
  marked?: boolean;
  rest?: Record<string, unknown>;
}) => {
  if (!text) return null;

  const textLength = text.length;

  if (textLength > MAX_LENGTH) {
    const start = Math.floor((MAX_LENGTH - 3) / 2);
    const end = Math.ceil((MAX_LENGTH - 3) / 2);

    return (
      <Popover content={text}>
        <div style={{ height: '40px' }}>
          <Typography.Text className={styles.text} mark={!!marked} {...rest}>
            {text.slice(0, start)}...{text.slice(textLength - end)}
          </Typography.Text>
        </div>
      </Popover>
    );
  }

  return (
    <Popover content={text}>
      <div style={{ height: '40px' }}>
        <Typography.Text
          className={styles.text}
          key={els ? els.length : 0}
          {...rest}
        >
          {text}
        </Typography.Text>
      </div>
    </Popover>
  );
};
