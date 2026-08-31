import { Select, Divider, Typography, Space, Tag } from 'antd';
import React, { useState, useEffect } from 'react';
import { Constants, Manifest } from '@rsdoctor/shared/types';
import TotalSizeSvg from '../../common/svg/total-size.svg?react';
import { changeOrigin, fetchManifest, getSharingUrl } from '../../utils';
import Icon from '@ant-design/icons';

export const BuilderSelect: React.FC = () => {
  const [buildName, setBuildName] = useState('');
  const [series, setSeries] = useState<Manifest.RsdoctorManifestSeriesData[]>(
    [],
  );

  useEffect(() => {
    const briefData = window[Constants.WINDOW_RSDOCTOR_TAG] as
      | {
          name?: string;
          series?: Manifest.RsdoctorManifestSeriesData[];
        }
      | undefined;
    if (briefData?.name && briefData.series?.length) {
      setBuildName(briefData.name);
      setSeries(briefData.series);
      return;
    }

    fetchManifest().then(({ name, series }) => {
      if (name) {
        setBuildName(name);
      }

      if (series && series.length > 0) {
        setSeries(series);
      }
    });
  }, []);

  if (buildName.length <= 0 || series.length <= 1) {
    return <></>;
  }

  return (
    <>
      <Divider type="vertical" style={{ margin: '0 24px' }} />
      <Space>
        <Icon style={{ fontSize: '18px' }} component={TotalSizeSvg} />
        <Typography>Compiler</Typography>
        <Select
          className="builder-selector"
          defaultValue={buildName}
          bordered={false}
          style={{ minWidth: 100 }}
          onChange={(val) => {
            const item = series.find((item) => item.name === val);

            if (item) {
              if (item.origin) {
                location.href = changeOrigin(item.origin);
              } else if (item.path) {
                location.href = item.path.endsWith('.html')
                  ? new URL(item.path, location.href).href
                  : getSharingUrl(item.path);
              } else {
                console.error('No Rsdoctor compiler report location');
              }
            }
          }}
        >
          {series.map((item) => (
            <Select.Option
              key={item.name}
              value={item.name}
              className="builder-selector-option-item"
            >
              <Space size={6}>
                <span>{item.displayName || item.name}</span>
                {item.isChild ? (
                  <Tag color="blue" bordered={false}>
                    Child
                  </Tag>
                ) : null}
              </Space>
            </Select.Option>
          ))}
        </Select>
      </Space>
    </>
  );
};
