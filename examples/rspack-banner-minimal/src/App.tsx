import React from 'react';
import { Button } from '@arco-design/web-react';
import '@arco-design/web-react/dist/css/arco.css';
import styles from './index.module.less';

export function App({ name }: any) {
  return (
    <>
      Hello <i>{name}</i>. Welcome!
      <>
        <h1 className={styles.header}>Title:{name}</h1>
        <p className="worker">Content</p>
        <Button type="primary">Hello Arco</Button>,
      </>
    </>
  );
}
