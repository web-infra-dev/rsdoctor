import { Select, Divider, Typography, Space } from 'antd';
import React, { useState, useEffect } from 'react';
import { Manifest } from '@rsdoctor/types';
import TotalSizeSvg from '../../common/svg/total-size.svg';
import {
  fetchManifest,
  changeOrigin,
  getSafeReportUrl,
  getSharingUrl,
} from '../../utils';
import Icon from '@ant-design/icons';

export const BuilderSelect: React.FC = () => {
  const [buildName, setBuildName] = useState('');
  const [series, setSeries] = useState<Manifest.RsdoctorManifestSeriesData[]>(
    [],
  );

  useEffect(() => {
    fetchManifest().then(({ name, series }) => {
      if (name) {
        setBuildName(name);
      }

      if (series && series.length > 0) {
        setSeries(series);
      }
    });
  }, []);

  if (buildName.length <= 0 || series.length <= 0) {
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
                const href = changeOrigin(item.origin);
                if (href) {
                  location.href = href;
                } else {
                  console.error('Invalid Rsdoctor compiler report origin');
                }
              } else if (item.path) {
                const href = getSafeReportUrl(
                  item.path.endsWith('.html')
                    ? item.path
                    : getSharingUrl(item.path),
                  location.href,
                );

                if (href) {
                  location.href = href;
                } else {
                  console.error('Invalid Rsdoctor compiler report location');
                }
              } else {
                console.error('No Rsdoctor compiler report location');
              }
            }
          }}
        >
          {series.map((item, i) => (
            <Select.Option
              key={i}
              value={item.name}
              className="builder-selector-option-item"
            >
              {item.name}
            </Select.Option>
          ))}
        </Select>
      </Space>
    </>
  );
};
