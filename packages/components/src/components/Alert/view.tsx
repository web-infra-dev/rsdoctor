import React from 'react';
import { isNumber } from 'lodash-es';
import { Space, Alert, Button, Typography, Divider } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useRuleIndexNavigate } from '../../utils';
import { TextDrawer } from '../TextDrawer';
import { Title } from '../Title';
import { CodeOpener } from '../Opener';
import { CodeViewer } from '../CodeViewer';
import { CodeViewAlertProps } from './types';

export const CodeViewDrawerContent: React.FC<CodeViewAlertProps> = ({ data, cwd }) => {
  const { file } = data;
  const { path, ranges } = file;
  const line = ranges?.[0].start.line;

  return (
    <Space direction="vertical" className="alert-space">
      <Title text="Code Viewer" />
      <CodeOpener cwd={cwd} url={path} loc={isNumber(line) ? String(line) : undefined} code disabled />
      <CodeViewer path={file.path} content={file.content} ranges={ranges} defaultLine={line} />
    </Space>
  );
};

export const CodeViewAlert: React.FC<CodeViewAlertProps> = ({ data, cwd }) => {
  const { title, description = '', level, code, file } = data;
  const navigate = useRuleIndexNavigate(code, data.link);
  const startLine = file.ranges?.[0].start.line;

  const Description = (
    <Space direction="vertical">
      <Typography.Text>{description}</Typography.Text>
      <Space>
        <Typography.Text>File:</Typography.Text>
        <Typography.Text strong code>
          {file.path}
        </Typography.Text>
        {isNumber(startLine) ? (
          <>
            <Typography.Text>in line</Typography.Text>
            <Typography.Text strong code>
              {startLine}
            </Typography.Text>
          </>
        ) : (
          ''
        )}
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
      type={level === 'warn' ? 'info' : level}
      action={
        <Space>
          <TextDrawer text={'Show Source Code'} buttonProps={{ size: 'small' }}>
            <CodeViewDrawerContent data={data} cwd={cwd} />
          </TextDrawer>
          <>
            <Divider type="vertical" />
            <Button type="link" onClick={navigate} size="small" icon={<InfoCircleOutlined />} />
          </>
        </Space>
      }
    />
  );
};
