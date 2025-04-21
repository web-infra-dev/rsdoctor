import { DiffOutlined } from '@ant-design/icons';
import { Col, Row, Segmented, Typography } from 'antd';
import React, { useState } from 'react';
import { DiffViewer } from 'src/components/base';
import { TextDrawer } from '../../../../components/TextDrawer';
import { Size } from '../../../../constants';

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
      style={{ height: '100%', alignContent: 'flex-start' }}
    >
      {data.length > 1 ? (
        <Col span={24}>
          <Segmented
            value={group}
            options={data.map((e) => e.group)}
            onChange={(e) => setGroup(e as string)}
          />
        </Col>
      ) : null}
      {match ? (
        <React.Fragment key={group}>
          <Col span={24}>
            <Typography.Text strong>
              {match.baselineTitle || 'Baseline'} ⟷{' '}
              {match.currentTitle || 'Current'}
            </Typography.Text>
          </Col>
          <Col span={24}>
            <DiffViewer
              originalFilePath={file}
              modifiedFilePath={file}
              original={match.baseline || ''}
              modified={match.current || ''}
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
