import { Common } from '@rsdoctor/types';
import { Button, Empty, Space, Typography } from 'antd';
import React from 'react';

interface FailedStatusProps {
  title?: string;
  buttonText?: string;
  retry: Common.Function;
}

const defaultTitle = 'Load data failed, please try again';
const defaultBottonText = 'retry';

const FailedStatusComponent: React.FC<FailedStatusProps> = ({
  title = defaultTitle,
  buttonText = defaultBottonText,
  retry,
}) => {
  return (
    <Empty
      description={
        <Space direction="vertical">
          <Typography.Text>{title}</Typography.Text>
          <Button
            type="primary"
            onClick={() => {
              retry();
            }}
          >
            {buttonText}
          </Button>
        </Space>
      }
    />
  );
};

export const FailedStatus = React.memo(FailedStatusComponent);
