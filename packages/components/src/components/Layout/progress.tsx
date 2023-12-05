import React from 'react';
import { Col, Progress as P, Row, Typography } from 'antd';
import { SDK } from '@rsdoctor/types';
import { Size } from 'src/constants';
import { withServerAPI } from '../Manifest';

export interface ProgressProps {
  progress: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.APIExtends.GetCompileProgess>;
}

const ProgressBase: React.FC<ProgressProps> = ({ progress }) => {
  if (!progress) return null;

  const { percentage = 1, message } = progress;

  if (percentage >= 1) return null;

  const per = +(percentage * 100).toFixed(1);

  return (
    <Row
      wrap
      style={{
        width: '100%',
        position: 'fixed',
        top: Size.NavBarHeight,
        left: 1,
        zIndex: 99,
      }}
    >
      <Col span={Math.min(Math.floor(percentage * 24), 24)}>
        <P
          percent={100}
          status="active"
          size="small"
          format={() => (
            <Typography.Text style={{ fontSize: 12 }} type="secondary">{`${per}% ${message}`}</Typography.Text>
          )}
        />
      </Col>
    </Row>
  );
};

export const Progress = withServerAPI({
  api: SDK.ServerAPI.APIExtends.GetCompileProgess,
  responsePropName: 'progress',
  Component: ProgressBase,
  fallbackComponent: () => null,
});
