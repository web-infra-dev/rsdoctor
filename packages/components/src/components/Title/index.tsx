import React, { PropsWithChildren } from 'react';
import { Typography } from 'antd';
import { upperFirst as upf } from 'lodash-es';

interface TitleProps {
  /**
   * @default true
   */
  upperFisrt?: boolean;
  /**
   * @default 16
   */
  fontSize?: number;
  text: string | React.ReactNode;
  hash?: string;
}

export const Title: React.FC<PropsWithChildren<TitleProps>> = ({ upperFisrt = true, fontSize = 16, text, hash }) => {
  const t = typeof text === 'string' ? (upperFisrt ? upf(text) : text) : text;
  return (
    <Typography.Text style={{ fontSize }} strong>
      {hash ? (
        <a href={hash} id={hash.replace(/^#/, '')} style={{ color: 'inherit' }}>
          {t}
        </a>
      ) : (
        t
      )}
    </Typography.Text>
  );
};
