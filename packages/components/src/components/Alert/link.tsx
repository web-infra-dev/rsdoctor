import React from 'react';
import { Alert, Button, Space, Typography } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useRuleIndexNavigate } from '../../utils';
import { LinkAlertProps } from './types';

export const LinkRuleAlert: React.FC<LinkAlertProps> = ({ data }) => {
  const { title, description = '', level, code } = data;
  const navigate = useRuleIndexNavigate(code, data.link);

  return (
    <Alert
      showIcon
      message={
        <Space>
          <Typography.Text code strong onClick={navigate} style={{ cursor: 'pointer' }}>
            <a>{code}</a>
          </Typography.Text>
          <Typography.Text strong>{title}</Typography.Text>
        </Space>
      }
      description={<div dangerouslySetInnerHTML={{ __html: description }} />}
      type={level === 'warn' ? 'info' : level}
      action={
        <Button type="link" onClick={navigate} size="small">
          More
          <InfoCircleOutlined />
        </Button>
      }
    />
  );
};
