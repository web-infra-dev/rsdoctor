import { Button, Drawer, ButtonProps, DrawerProps } from 'antd';
import React, { CSSProperties, PropsWithChildren, useState } from 'react';
import { drawerWidth } from '../../constants';

export interface TextDrawerProps {
  text?: string | React.ReactNode;
  button?: React.ReactNode;
  buttonProps?: ButtonProps;
  buttonStyle?: CSSProperties;
  drawerProps?: DrawerProps;
}

export const TextDrawer = (props: PropsWithChildren<TextDrawerProps>): JSX.Element => {
  const [visible, setVisible] = useState(false);

  return (
    <React.Fragment>
      {props.button ? (
        <div onClick={() => setVisible(!visible)}>{props.button}</div>
      ) : (
        <Button
          type={'link'}
          {...props.buttonProps}
          onClick={() => setVisible(!visible)}
          style={{ padding: 0, ...props.buttonStyle }}
        >
          {props.text}
        </Button>
      )}
      <Drawer
        maskClosable
        width={drawerWidth}
        zIndex={999}
        {...props.drawerProps}
        open={visible}
        onClose={() => setVisible(false)}
        destroyOnClose
      >
        {props.children}
      </Drawer>
    </React.Fragment>
  );
};

export * from './duplicate';
