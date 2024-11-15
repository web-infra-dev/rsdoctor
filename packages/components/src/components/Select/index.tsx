import React, { useEffect, useState } from 'react';
import { Button, Col, Input, Row, Select, Typography } from 'antd';
import { FileSearchOutlined, SelectOutlined } from '@ant-design/icons';
import { KeywordInput } from '../Form/keyword';
import { Size } from 'src/constants';
import { ServerAPIProvider } from '../Manifest';
import { SDK } from '@rsdoctor/types';

interface LoaderNamesSelectProps {
  style?: React.CSSProperties;
  onChange: (loaders: string[]) => void;
  loaderNames: string[];
}

export type ISelectLoaderProps = {
  loaders: string[];
  filename: string;
  layer?: string;
};

export const LoaderNamesSelect: React.FC<LoaderNamesSelectProps> = ({
  style,
  onChange,
  loaderNames,
}) => {
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
        style={{ width: 300 }}
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

const LoaderLayerSelect: React.FC<{
  onChange(value: string): void;
  layers: string[];
}> = ({ onChange, layers }) => {
  const [layer, setLayer] = useState('');
  const labelStyle: React.CSSProperties = { width: 120 };

  return (
    <Input.Group compact>
      <Button style={labelStyle}>
        <SelectOutlined />
        <Typography.Text>Layers</Typography.Text>
      </Button>
      <Select
        allowClear
        style={{ width: 150 }}
        defaultValue={layer}
        placeholder={'select layer'}
        onChange={(e) => {
          setLayer(e);
          onChange(e);
        }}
      >
        {layers?.length ? (
          layers?.map((e) => {
            return (
              <Select.Option key={e} label={e} value={e}>
                {e}
              </Select.Option>
            );
          })
        ) : (
          <></>
        )}
      </Select>
    </Input.Group>
  );
};

export const LoaderCommonSelect: React.FC<{
  onChange(value: ISelectLoaderProps): void;
  loaderNames: string[];
}> = ({ onChange, loaderNames }) => {
  const [selectLoaders, setSelectLoaders] = useState<string[]>([]);
  const [filename, setFilename] = useState('');
  const [layer, setLayer] = useState('');

  useEffect(() => {
    onChange({ loaders: selectLoaders, filename, layer });
  }, [selectLoaders, filename, layer]);

  return (
    <Row style={{ marginBottom: Size.BasePadding }}>
      <Col>
        <LoaderNamesSelect
          loaderNames={loaderNames}
          style={{ marginRight: Size.BasePadding / 2 }}
          onChange={(e) => {
            setSelectLoaders(e);
          }}
        />
      </Col>
      <Col>
        <KeywordInput
          icon={<FileSearchOutlined />}
          style={{ marginRight: Size.BasePadding / 2 }}
          label="Filename"
          placeholder="search filename by keyword"
          onChange={(e) => {
            setFilename(e);
          }}
        />
      </Col>
      <Col>
        <ServerAPIProvider api={SDK.ServerAPI.API.GetLayers}>
          {(layers) =>
            layers.length ? (
              <LoaderLayerSelect
                layers={layers}
                onChange={(e) => {
                  setLayer(e);
                }}
              />
            ) : (
              <></>
            )
          }
        </ServerAPIProvider>
      </Col>
    </Row>
  );
};
