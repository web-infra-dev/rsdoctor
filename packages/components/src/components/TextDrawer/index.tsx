import { CodeOutlined } from '@ant-design/icons';
import { Button, Drawer, ButtonProps, DrawerProps } from 'antd';
import React, {
  CSSProperties,
  HTMLAttributes,
  PropsWithChildren,
  useState,
} from 'react';

export interface TextDrawerProps {
  text?: string | React.ReactNode;
  button?: React.ReactNode;
  buttonProps?: ButtonProps;
  buttonStyle?: CSSProperties;
  drawerProps?: DrawerProps;
  containerProps?: HTMLAttributes<HTMLDivElement>;
}

export const TextDrawer = (
  props: PropsWithChildren<TextDrawerProps>,
): JSX.Element => {
  const [visible, setVisible] = useState(false);

  return (
    // avoid propagation event affect collapse component
    <div onClick={(e) => e.stopPropagation()} {...props.containerProps}>
      {props.button ? (
        <div onClick={() => setVisible(!visible)}>{props.button}</div>
      ) : props.text ? (
        <Button
          type={'link'}
          {...props.buttonProps}
          onClick={() => setVisible(!visible)}
          style={{ padding: 0, ...props.buttonStyle }}
        >
          {props.text}
        </Button>
      ) : (
        <CodeOutlined
          style={{ fontSize: 14, padding: 0 }}
          onClick={() => setVisible(!visible)}
        />
      )}
      <Drawer
        maskClosable
        zIndex={999}
        width={'60%'}
        {...props.drawerProps}
        open={visible}
        onClose={() => setVisible(false)}
        destroyOnClose
      >
        {props.children}
      </Drawer>
    </div>
  );
};

export * from './duplicate';
