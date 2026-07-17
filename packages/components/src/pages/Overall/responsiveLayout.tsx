import { Flex } from 'antd';
import React from 'react';

import style from './index.module.scss';

interface Props {
  children: React.ReactNode[];
}

export const ResponsiveLayout = ({ children }: Props) => {
  return (
    <Flex vertical className={style.layout}>
      {children.map((element, index) => (
        <div className={style.row} key={index}>
          {element}
        </div>
      ))}
    </Flex>
  );
};
