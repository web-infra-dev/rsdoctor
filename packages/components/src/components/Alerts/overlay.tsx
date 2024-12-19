import React, { useState } from 'react';
import { SDK } from '@rsdoctor/types';
import {
  Alert,
  Button,
  Col,
  Collapse,
  Row,
  Tag,
  Typography,
  Badge,
} from 'antd';
import {
  BugOutlined,
  CloseCircleOutlined,
  DownOutlined,
  RightOutlined,
} from '@ant-design/icons';
import Dialog from 'rc-dialog';
import Ansi from 'ansi-to-react';
import { withServerAPI } from '../Manifest';
import { Size, Color } from '../../constants';

import 'rc-dialog/assets/index.css';

function getOverlayAlertsMessage(
  alerts: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetOverlayAlerts>,
) {
  let warns = 0;
  let errors = 0;

  alerts.forEach((item) => {
    if (item.level === 'warn') {
      warns++;
    } else {
      errors++;
    }
  });

  const suffixText =
    warns !== 0 && errors !== 0 ? 'problems' : warns === 0 ? 'errors' : 'warns';

  const fontSize = 16;

  return {
    title: `${alerts.length} compiled ${suffixText}`,
    detail: (
      <Typography.Text strong style={{ color: '#fff', marginBottom: 0 }}>
        <Typography.Text style={{ color: 'inherit', fontSize }}>
          Compiled with{' '}
        </Typography.Text>
        <Typography.Text strong style={{ color: Color.Red, fontSize }}>
          {errors} errors
        </Typography.Text>
        <Typography.Text style={{ color: 'inherit', fontSize }}>
          {' '}
          and{' '}
        </Typography.Text>
        <Typography.Text strong style={{ color: Color.Yellow, fontSize }}>
          {warns} warnings
        </Typography.Text>
      </Typography.Text>
    ),
    warns,
    errors,
  };
}

export const OverlayAlertsModal: React.FC<{
  alerts: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetOverlayAlerts>;
  open: boolean;
  onClose(): void;
}> = ({ alerts = [], open, onClose }) => {
  if (!alerts.length) return null;

  return (
    <Dialog
      visible={open}
      onClose={() => onClose()}
      style={{ width: '100%', height: '100%', margin: 0, zIndex: 1000 }}
      closable={false}
      modalRender={(e) => {
        return React.cloneElement(e as React.ReactElement, {
          style: {
            background: 'rgba(0, 0, 0, 0.7)',
            color: '#fff',
            height: '100%',
            overflow: 'scroll',
            borderRadius: 0,
          },
        });
      }}
    >
      <Row justify="space-between" align="middle">
        {getOverlayAlertsMessage(alerts).detail}
        <Button
          onClick={() => onClose()}
          type="text"
          style={{ color: '#fff' }}
          size="large"
          icon={<CloseCircleOutlined />}
        ></Button>
      </Row>
      <Row gutter={[0, Size.BasePadding]}>
        {alerts.map((e) => {
          return (
            <Col
              span={24}
              key={e.id}
              style={{
                whiteSpace: 'pre-wrap',
                lineHeight: `16px`,
                fontSize: 14,
              }}
            >
              <Collapse
                ghost
                style={{ background: '#000' }}
                defaultActiveKey={[e.id]}
                expandIcon={(e) => {
                  return e.isActive ? (
                    <DownOutlined style={{ color: '#fff' }} />
                  ) : (
                    <RightOutlined style={{ color: '#fff' }} />
                  );
                }}
              >
                <Collapse.Panel
                  header={
                    <div style={{ color: '#fff' }}>
                      {e.level === 'warn' ? (
                        <Tag color={Color.Yellow}>WARNING</Tag>
                      ) : (
                        <Tag color={Color.Red}>ERROR</Tag>
                      )}
                      <Ansi>{e.description || e.title}</Ansi>
                    </div>
                  }
                  key={e.id}
                >
                  <div style={{ color: '#fff' }}>
                    <Ansi>{e.stack}</Ansi>
                  </div>
                </Collapse.Panel>
              </Collapse>
            </Col>
          );
        })}
      </Row>
    </Dialog>
  );
};

export const OverlayAlertsTips: React.FC<{
  alerts: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetOverlayAlerts>;
  defaultOpen?: boolean;
}> = ({ alerts = [], defaultOpen = alerts.length > 0 }) => {
  if (!alerts.length) return null;

  const [open, setOpen] = useState(defaultOpen);

  return (
    <React.Fragment>
      <Alert
        banner
        message={React.cloneElement(getOverlayAlertsMessage(alerts).detail, {
          style: {
            color: '#000',
          },
        })}
        icon={<BugOutlined />}
        action={
          <Button onClick={() => setOpen(true)} size="small">
            More
          </Button>
        }
      ></Alert>
      <OverlayAlertsModal
        alerts={alerts}
        open={open}
        onClose={() => setOpen(false)}
      />
    </React.Fragment>
  );
};

export const OverlayAlertsButton: React.FC<{
  alerts: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetOverlayAlerts>;
}> = ({ alerts = [] }) => {
  if (!alerts.length) return null;

  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative', top: '4px' }}>
      <Badge count={5} size="small">
        <BugOutlined style={{ fontSize: 15 }} onClick={() => setOpen(!open)} />
      </Badge>
      <OverlayAlertsModal
        alerts={alerts}
        open={open}
        onClose={() => setOpen(false)}
      />
    </div>
  );
};

export const OverlayAlertsWithButton = withServerAPI({
  api: SDK.ServerAPI.API.GetOverlayAlerts,
  Component: OverlayAlertsButton,
  responsePropName: 'alerts',
  fallbackComponent: () => null,
});

export const OverlayAlertsWithTips = withServerAPI({
  api: SDK.ServerAPI.API.GetOverlayAlerts,
  Component: OverlayAlertsTips,
  responsePropName: 'alerts',
  fallbackComponent: () => null,
});
