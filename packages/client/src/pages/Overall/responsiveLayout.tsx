import { Flex } from 'antd';
import React from 'react';

import style from './index.module.scss';

interface Props {
  children: React.ReactNode[];
}

export const ResponsiveLayout = ({ children }: Props) => {
  return (
    <Flex vertical className={style.layout}>
      {children.map((e) => (
        <div className={style.row}>{e}</div>
      ))}
    </Flex>
  );
};
