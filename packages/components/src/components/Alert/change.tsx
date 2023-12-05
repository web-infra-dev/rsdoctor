import React, { useState } from 'react';
import axios from 'axios';
import { Space, Alert, Button, Typography, Divider, Popconfirm, Row, Col } from 'antd';
import { InfoCircleOutlined, CheckOutlined } from '@ant-design/icons';
import { SDK } from '@rsdoctor/types';
import { useRuleIndexNavigate } from '../../utils';
import { TextDrawer } from '../TextDrawer';
import { Title } from '../Title';
import { CodeOpener } from '../Opener';
import { DiffViewer } from '../CodeViewer';
import { CodeChangeAlertProps } from './types';

interface FixedProps {
  setIsFixed(val: boolean): void;
}

export const CodeChangeDrawerContent: React.FC<CodeChangeAlertProps & FixedProps> = ({ data, setIsFixed, cwd }) => {
  const { file, id } = data;
  const { path, line, isFixed, actual, expected } = file;
  // const [isFixed, setIsFixed] = useState(file.isFixed ?? false);
  const applyFix = () => {
    axios.post(SDK.ServerAPI.API.ApplyErrorFix, { id }).then(() => {
      setIsFixed(true);
    });
  };

  const FixButton = () => {
    return (
      <Popconfirm
        title={`Did you confirm to apply the change i the area below ?`}
        onConfirm={applyFix}
        okText="Yes"
        cancelText="Cancel"
        zIndex={99999}
        disabled={isFixed}
        placement="bottom"
      >
        <Button type="primary" size="small" icon={isFixed ? <CheckOutlined /> : undefined} disabled={isFixed}>
          {isFixed ? 'Fix Applied' : 'Apply Fix'}
        </Button>
      </Popconfirm>
    );
  };

  return (
    <Space direction="vertical" className="alert-space">
      <div>
        <Title text={isFixed ? 'Fix History' : 'Suggest Fix'} />
        <span className="code-change-tag-list">
          <FixButton />
        </span>
      </div>
      <CodeOpener cwd={cwd} url={path} loc={String(line)} code disabled />
      <Row>
        <Col span={12}>
          <Typography.Text strong>Before</Typography.Text>
        </Col>
        <Col span={12}>
          <Typography.Text strong>After</Typography.Text>
        </Col>
      </Row>
      <DiffViewer className="full-space" filepath={path} before={actual} after={expected} />
    </Space>
  );
};

export const CodeChangeAlert: React.FC<CodeChangeAlertProps> = ({ data, cwd }) => {
  const { title, description = '', level, code, file } = data;
  const [isFixed, setIsFixed] = useState(file.isFixed ?? false);
  const navigate = useRuleIndexNavigate(code, data.link);
  const fixFile = (val: boolean) => {
    setIsFixed(val);
    file.isFixed = val;
  };
  const Description = (
    <Space direction="vertical">
      <Typography.Text>{description}</Typography.Text>
      <Space>
        <Typography.Text>File:</Typography.Text>
        <Typography.Text strong code>
          {file.path}
        </Typography.Text>
        <Typography.Text>in line</Typography.Text>
        <Typography.Text strong code>
          {file.line}
        </Typography.Text>
      </Space>
    </Space>
  );

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
      description={Description}
      type={isFixed ? 'success' : level === 'warn' ? 'warning' : level}
      action={
        <Space>
          <TextDrawer
            text={isFixed ? 'Fixed | Show Fix History' : 'Show Fix Suggestion'}
            buttonProps={{ size: 'small' }}
          >
            <CodeChangeDrawerContent data={data} setIsFixed={fixFile} cwd={cwd} />
          </TextDrawer>
          <Divider type="vertical" />
          <Button type="link" onClick={navigate} size="small">
            <InfoCircleOutlined />
          </Button>
        </Space>
      }
    />
  );
};
