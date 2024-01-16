import { Select, Divider, Typography } from 'antd';
import React, { useState, useEffect } from 'react';
import { Manifest } from '@rsdoctor/types';
import Icon from '../../common/imgs/connection-point.svg';
import { fetchManifest, changeOrigin } from '../../utils';

export const BuilderSelect: React.FC = () => {
  const [buildName, setBuildName] = useState('');
  const [series, setSeries] = useState<Manifest.RsdoctorManifestSeriesData[]>([]);

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
      <img src={Icon} style={{ marginRight: 6, height: 16 }} />
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
            } else {
              console.error('No RsdoctorManifestSeriesData.origin')
            }
          }
        }}
      >
        {series.map((item, i) => (
          <Select.Option key={i} value={item.name} className="builder-selector-option-item">
            {item.name}
          </Select.Option>
        ))}
      </Select>
    </>
  );
};
