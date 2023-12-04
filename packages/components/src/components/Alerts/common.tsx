import { Collapse, Space, Radio, Typography, Tooltip } from 'antd';
import React, { useMemo } from 'react';
import { AppstoreOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { Rule } from '@rsdoctor/types';
import { groupBy, values } from 'lodash-es';
import { Size, ViewMode } from '../../constants';
import { Alert } from '../Alert';
import { Card } from '../Card';
import { Badge as Bdg } from '../Badge';
import { AlertProps } from '../Alert/types';
import { RuleErrorCodes } from '@rsdoctor/types/dist/rule';

interface CommonAlertsContainerProps {
  title: string;
  cwd: string;
  dataSource: Rule.RuleStoreDataItem[];
  extraData: Omit<AlertProps, 'data'>;
  viewMode: ViewMode;
  setViewMode(mode: ViewMode): void;
  extraCom?: JSX.Element | undefined;
}

interface CommonAlertsContentProps extends Pick<CommonAlertsContainerProps, 'dataSource' | 'extraData'> {}

const LevelMap = {
  warn: 1,
  error: 2,
};

const CommonAlertsList: React.FC<CommonAlertsContentProps> = ({ dataSource, extraData }) => {
  const _dataSource = useMemo(
    () =>
      dataSource.slice().sort((a, b) => {
        return LevelMap[b.level] - LevelMap[a.level];
      }),
    [dataSource],
  );

  return (
    <Space direction="vertical" style={{ wordBreak: 'break-all', width: '100%' }}>
      {_dataSource.map((err, i) => {
        return <Alert data={err} key={i} {...extraData} />;
      })}
    </Space>
  );
};

const CommonAlertsGroup: React.FC<CommonAlertsContentProps> = ({ dataSource, extraData }) => {
  const _dataSource = useMemo(() => values(groupBy(dataSource, (e) => e.code)), [dataSource]);

  return (
    <Space direction="vertical" style={{ wordBreak: 'break-all', width: '100%' }}>
      <Collapse>
        {_dataSource.map((el) => {
          const [first] = el;
          return (
            <Collapse.Panel
              header={
                <Space>
                  <Typography.Text code strong style={{ cursor: 'pointer' }}>
                    {first.code}
                  </Typography.Text>
                  <Typography.Text strong>{Rule.RuleErrorMap[first.code as keyof RuleErrorCodes]?.title || first.title}</Typography.Text>
                  <Bdg label={'count'} value={el.length} type="error" />
                </Space>
              }
              key={first.code}
            >
              <Space direction="vertical" size={16}>
                {el.map((err, i) => {
                  return <Alert data={err} key={i} {...extraData} />;
                })}
              </Space>
            </Collapse.Panel>
          );
        })}
      </Collapse>
    </Space>
  );
};

export const CommonAlertsContainer: React.FC<CommonAlertsContainerProps> = ({
  title,
  dataSource,
  extraData,
  viewMode,
  setViewMode,
  extraCom,
}) => {
  if (!dataSource.length) return null;

  return (
    <Card
      title={title}
      style={{ marginTop: Size.BasePadding }}
      collapsable
      extra={
        extraCom || (
          <Radio.Group
            options={[
              {
                label: (
                  <Tooltip title="display by list">
                    <UnorderedListOutlined />
                  </Tooltip>
                ),
                value: ViewMode.List,
              },
              {
                label: (
                  <Tooltip title="display by group">
                    <AppstoreOutlined />
                  </Tooltip>
                ),
                value: ViewMode.Group,
              },
            ]}
            value={viewMode}
            optionType="button"
            size="small"
            onChange={(v) => {
              setViewMode(v.target.value as ViewMode);
            }}
          />
        )
      }
    >
      {viewMode === ViewMode.List ? (
        <CommonAlertsList dataSource={dataSource} extraData={extraData} />
      ) : (
        <CommonAlertsGroup dataSource={dataSource} extraData={extraData} />
      )}
    </Card>
  );
};
