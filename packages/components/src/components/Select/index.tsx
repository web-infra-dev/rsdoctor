import React, { useEffect, useState } from 'react';
import { Button, Input, Select, Space, Typography } from 'antd';
import { FileSearchOutlined, SelectOutlined } from '@ant-design/icons';
import { KeywordInput } from '../Form/keyword';
import { Size } from 'src/constants';

interface LoaderNamesSelectProps {
  style?: React.CSSProperties;
  onChange: (loaders: string[]) => void;
  loaderNames: string[];
}

export const LoaderNamesSelect: React.FC<LoaderNamesSelectProps> = ({ style, onChange, loaderNames }) => {
  const [selectLoaders, setSelectLoaders] = useState([]);

  const labelStyle: React.CSSProperties = { width: 120 };

  return (
    <Input.Group compact style={style}>
      <Button style={labelStyle}>
        <SelectOutlined />
        <Typography.Text>Loaders</Typography.Text>
      </Button>
      <Select
        mode="multiple"
        allowClear
        defaultValue={selectLoaders}
        style={{ width: 350 }}
        dropdownMatchSelectWidth
        placeholder={'select loaders'}
        onChange={(e) => {
          setSelectLoaders(e);
          onChange(e);
        }}
      >
        {loaderNames.map((e) => {
          return (
            <Select.Option key={e} label={e} value={e}>
              {e}
            </Select.Option>
          );
        })}
      </Select>
    </Input.Group>
  );
};

export const LoaderCommonSelect: React.FC<{
  onChange(value: { loaders: string[]; filename: string }): void;
  loaderNames: string[];
}> = ({ onChange, loaderNames }) => {
  const [selectLoaders, setSelectLoaders] = useState<string[]>([]);
  const [filename, setFilename] = useState('');

  useEffect(() => {
    onChange({ loaders: selectLoaders, filename });
  }, [selectLoaders, filename]);

  return (
    <Space style={{ marginBottom: Size.BasePadding }}>
      <LoaderNamesSelect
        loaderNames={loaderNames}
        style={{ marginRight: Size.BasePadding - 8 }}
        onChange={(e) => {
          setSelectLoaders(e);
        }}
      />
      <KeywordInput
        icon={<FileSearchOutlined />}
        label="Filename"
        placeholder="search filename by keyword"
        onChange={(e) => {
          setFilename(e);
        }}
      />
    </Space>
  );
};
