import React, { useState } from 'react';
import { Col, Row, Typography, Segmented } from 'antd';
import { DiffOutlined } from '@ant-design/icons';
import { DiffViewer } from 'src/components/CodeViewer';
import { Size } from '../../../../constants';
import { TextDrawer } from '../../../../components/TextDrawer';

interface ViewChangesContentProps {
  file: string;
  data: {
    baseline?: string | void;
    current: string | void;
    baselineTitle?: string;
    currentTitle?: string;
    group: string;
  }[];
}

const ViewChangesContent: React.FC<ViewChangesContentProps> = ({
  file,
  data,
}) => {
  const [group, setGroup] = useState(data[0].group);

  const match = data.find((e) => e.group === group);

  return (
    <Row
      wrap
      gutter={[Size.BasePadding, Size.BasePadding]}
      style={{ height: '100%' }}
    >
      {data.length > 1 ? (
        <Col span={24}>
          <Segmented
            style={{ marginTop: Size.BasePadding }}
            value={group}
            options={data.map((e) => e.group)}
            onChange={(e) => setGroup(e as string)}
          />
        </Col>
      ) : null}
      {match ? (
        <React.Fragment key={group}>
          <Col span={12}>
            <Typography.Text strong>
              {match.baselineTitle || 'Baseline'}
            </Typography.Text>
          </Col>
          <Col span={12}>
            <Typography.Text strong>
              {match.currentTitle || 'Current'}
            </Typography.Text>
          </Col>
          <Col span={24}>
            <DiffViewer
              filepath={file}
              before={match.baseline || ''}
              after={match.current || ''}
              editorProps={{
                // eslint-disable-next-line financial/no-float-calculation
                height: Math.floor(window.innerHeight / 1.25),
              }}
            />
          </Col>
        </React.Fragment>
      ) : null}
    </Row>
  );
};

export const ViewChanges: React.FC<
  ViewChangesContentProps & { text?: string }
> = ({ text = 'View Changes', ...props }) => {
  return (
    <TextDrawer
      text={text}
      buttonProps={{
        size: 'small',
        icon: <DiffOutlined />,
      }}
      drawerProps={{
        destroyOnClose: true,
        title: `Content diff for "${props.file}"`,
      }}
    >
      <ViewChangesContent {...props} />
    </TextDrawer>
  );
};
