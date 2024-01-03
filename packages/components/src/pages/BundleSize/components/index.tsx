import { CodepenCircleOutlined, ColumnHeightOutlined, DeploymentUnitOutlined, InfoCircleOutlined, VerticalAlignMiddleOutlined } from '@ant-design/icons';
import { Client, SDK } from '@rsdoctor/types';
import {
  Button,
  Card,
  Col,
  Divider,
  Empty,
  InputNumber,
  Radio,
  Row,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { debounce, includes, sumBy } from 'lodash-es';
import React, { useCallback, useMemo, useState } from 'react';
import { ServerAPIProvider, withServerAPI } from '../../../components/Manifest';
import { Badge as Bdg } from '../../../components/Badge';
import { FileTree } from '../../../components/FileTree';
import { KeywordInput } from '../../../components/Form/keyword';
import { Keyword } from '../../../components/Keyword';
import { Title } from '../../../components/Title';
import { Size } from '../../../constants';
import { createFileStructures, formatSize, useI18n } from '../../../utils';
import { BundleCards } from './cards';
import { CodeViewerWithDrawer } from '../../../components/CodeViewer';

import { AssetDetail } from './asset';
import './index.sass';
import { GraphType } from '../constants';

const { Option } = Select;

const cardBodyHeight = 410;

const largeCardBodyHeight = 800;

interface WebpackModulesOverallProps {
  cwd: string;
  errors: SDK.ErrorsData;
  summary: Client.DoctorClientAssetsSummary;
  entryPoints: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetEntryPoints>;
}

export const WebpackModulesOverallBase: React.FC<WebpackModulesOverallProps> = ({
  errors,
  cwd,
  summary,
  entryPoints,
}) => {
  const [selectedEntryPoints, setEntryPoints] = useState<SDK.EntryPointData[]>([]);
  const [inputModule, setModuleValue] = useState(0);
  const [inputAssetName, setAssetName] = useState('');
  const [inputAssetSize, setAssetSize] = useState(0);
  const [defaultExpandAll, setDefaultExpandAll] = useState(false);
  const [inputModuleUnit, setModuleUnit] = useState('');
  const [inputChunkUnit, setChunkUnit] = useState('');
  const [assetPath, setAssetPath] = useState<string | null>(null);
  const [fold, setFold] = useState(false as Boolean);
  const [graphType, setGraphType] = useState('tree' as GraphType);

  const { t } = useI18n();

  const assets = summary.all.total.files;

  const handleChange = useCallback(
    (type: string) => (value: string) => {
      if (type === 'module') {
        setModuleUnit(value);
      } else if (type === 'chunk') {
        setChunkUnit(value);
      }
    },
    [],
  );

  const selectAfter = (type: string) => (
    <Select defaultValue="kb" onChange={handleChange(type)}>
      <Option value="kb">KB</Option>
      <Option value="mb">MB</Option>
    </Select>
  );
  const onChangeModule = useCallback(
    debounce((newValue: number) => {
      const count = inputModuleUnit === 'mb' ? newValue * 1024 * 1024 : newValue * 1024;
      setModuleValue(count);
    }, 300),
    [],
  );

  const onChangeAsset = useCallback(
    debounce((newValue: number) => {
      const count = inputChunkUnit === 'mb' ? newValue * 1024 * 1024 : newValue * 1024;
      setAssetSize(count);
    }, 300),
    [],
  );

  const filteredAssets = useMemo(() => {
    let res = assets.slice();

    if (inputAssetName) {
      res = res.filter((e) => e.path.indexOf(inputAssetName) > -1);
    }

    if (inputAssetSize > 0) {
      res = res.filter((e) => e.size >= inputAssetSize);
    }

    if (selectedEntryPoints.length) {
      res = res.filter((e) => {
        if (selectedEntryPoints.some((ep) => includes(ep.assets, e.path))) {
          return true;
        }
        return false;
      });
    }

    return res.sort((a, b) => {
      const _a = a.path.indexOf('/') > -1 ? 1 : 0;
      const _b = b.path.indexOf('/') > -1 ? 1 : 0;
      // return _a - _b;
      return _b - _a;
    });
  }, [assets, selectedEntryPoints, inputAssetName, inputAssetSize]);

  const assetsStructures = useMemo(() => {
    const res = createFileStructures({
      files: filteredAssets.map((e) => e.path).filter(Boolean),
      fileTitle(file, basename) {
        const target = filteredAssets.find((e) => e.path === file)!;
        const { size, initial, path, content } = target;

        return (
          <Space
            onClick={() => {
              setAssetPath(path);
            }}
          >
            <Keyword text={basename} keyword={inputAssetName} />
            <Tag color={'success'} style={{ margin: 0 }}>
              {formatSize(size)}
            </Tag>

            {initial ? (
              <Tag color="cyan" style={{ margin: 0 }}>
                initial
              </Tag>
            ) : null}
            <CodeViewerWithDrawer
              path={path}
              content={content!}
              editorConfig={{ readOnly: false, domReadOnly: false }}
            />
          </Space>
        );
      },
    });
    return res;
  }, [filteredAssets]);

  const onSearch = (value: string) => {
    setAssetName(value);
    setDefaultExpandAll(false);
  };

  return (
    <React.Fragment>
      <BundleCards cwd={cwd} errors={errors} summary={summary} />
      <Radio.Group
        value={graphType}
        onChange={(e) => setGraphType(e.target.value)}
        style={{ marginBottom: Size.BasePadding }}
        buttonStyle="solid"
        optionType="button"
      >
        <Radio.Button value="tree">Tree Graph</Radio.Button>
        <Radio.Button value="tile">Bundle Analyzer Graph</Radio.Button>
      </Radio.Group>
      <Card
        hidden={graphType === 'tree'}
        title={
          <Space>
            <Title text="From: Webpack Bundle Analyzer" />
          </Space>
        }
      >
        {/* TODO: add loading icon. */}
        <ServerAPIProvider api={SDK.ServerAPI.API.GetTileReportHtml} body={{}}>
          {(data) => {
            if (data && graphType === 'tile') {
              return <iframe srcDoc={data} width={'100%'} height={largeCardBodyHeight} style={{ border: 'none' }} />;
            }
            return <Empty />;
          }}
        </ServerAPIProvider>
      </Card>

      <Card
        hidden={graphType === 'tile'}
        title={
          <Space>
            <Title text="Bundle Analysis" />
            <Tooltip
              color={'white'}
              title={
                <Space direction='vertical' color='white'>
                  <Row>
                    <Col>
                      <Tag color="cyan" style={{ margin: 0 }}>
                        initial
                      </Tag>
                      <Typography.Text>: Indignify whether the chunk is the initial chunk.</Typography.Text>
                    </Col>
                  </Row>
                  <Row>
                    <Col>
                      <Tag color="green">concatenated</Tag>
                      <Typography.Text>: Indignify whether the module is the concatenated module.  </Typography.Text>
                      <br />
                      <Typography.Text strong>Concatenated Module:</Typography.Text>
                      <Typography.Text>A series module is to lift or series multiple modules into a closure when packaging. </Typography.Text>
                    </Col>
                  </Row>
                  <Row>
                    <Col>
                      <Button
                        size="small"
                        icon={<CodepenCircleOutlined />}
                      />
                      <Typography.Text>: Open the code.</Typography.Text>
                    </Col>
                  </Row>
                  <Row>
                    <Col>
                      <Button
                        size="small"
                        icon={<DeploymentUnitOutlined />}
                      />
                      <Typography.Text>: View the module dependency, that is, module reasons in stats.json.</Typography.Text>
                    </Col>
                  </Row>
                  <Row>
                    <Col>
                      <Tag color={'purple'} >{'Parsed: 15.77 KB'}</Tag> 
                      <Typography.Text strong>Parsed Size</Typography.Text>
                      <Typography.Text>The size of the code which bundled. That is, after bundle and tree-shaking.</Typography.Text>
                    </Col>
                  </Row>
                  <Row>
                    <Col>
                      <Tag color={'orange'} >{'Source: 15.77 KB'}</Tag> 
                      <Typography.Text strong>Source Size</Typography.Text>
                      <Typography.Text>The size of the code which before bundle and transform.</Typography.Text>
                    </Col>
                  </Row>
                </Space>
                
              }
              style={{ marginLeft: 3, }}
            >
              <InfoCircleOutlined style={{ color: 'rgba(0,0,0,.45)' }} />
            </Tooltip>
          </Space>
        }
        extra={
          fold ? (
            <Button onClick={() => setFold(false)}>
              <Typography.Text>
                Expand <ColumnHeightOutlined />
              </Typography.Text>
            </Button>
          ) : (
            <Button onClick={() => setFold(true)}>
              <Typography.Text>
                Fold
                <VerticalAlignMiddleOutlined />
              </Typography.Text>
            </Button>
          )
        }
      >
        <Row align="middle" gutter={[Size.BasePadding, Size.BasePadding]}>
          {entryPoints && entryPoints.length ? (
            <Col>
              <Select
                mode="multiple"
                value={selectedEntryPoints.map((e) => e.name)}
                style={{ minWidth: 230, width: 'auto', maxWidth: 300 }}
                placeholder={'filter assets by entry point'}
                onChange={(name: string[]) => {
                  setEntryPoints(name.map((e) => entryPoints.find((ep) => ep.name === e)!).filter(Boolean));
                }}
                allowClear
                onClear={() => {
                  setEntryPoints([]);
                }}
              >
                {entryPoints.map((e) => {
                  return (
                    <Select.Option key={e.name} value={e.name}>
                      <Space>
                        <Bdg label={e.name} value={formatSize(e.size)} tooltip={e.name} />
                      </Space>
                    </Select.Option>
                  );
                })}
              </Select>
            </Col>
          ) : null}
          <Col>
            <KeywordInput placeholder="search asset by keyword" onChange={onSearch} />
          </Col>
          <Col span={7}>
            <InputNumber
              min={0}
              style={{ width: '95%' }}
              addonBefore={
                <Space>
                  <Typography.Text style={{ fontSize: 14, color: 'inherit' }}>Asset Size</Typography.Text>
                  <Tooltip
                    title={t('filter the output assets which size is greater than the input value')}
                    style={{ marginLeft: 3 }}
                  >
                    <InfoCircleOutlined style={{ color: 'rgba(0,0,0,.45)' }} />
                  </Tooltip>
                </Space>
              }
              onChange={(value) => onChangeAsset(Number(value))}
              addonAfter={selectAfter('chunk')}
            />
          </Col>
          <Col span={7}>
            <InputNumber
              min={0}
              style={{ width: '95%' }}
              addonBefore={
                <Space>
                  <Typography.Text style={{ fontSize: 14, color: 'inherit' }}>Module Size</Typography.Text>
                  <Tooltip
                    title={t('filter the modules which size is greater than the input value')}
                    style={{ marginLeft: 3 }}
                  >
                    <InfoCircleOutlined style={{ color: 'rgba(0,0,0,.45)' }} />
                  </Tooltip>
                </Space>
              }
              onChange={(value) => {
                onChangeModule(Number(value));
              }}
              addonAfter={selectAfter('module')}
            />
          </Col>
          <Col span={24}>
            {filteredAssets.length ? (
              <Row gutter={Size.BasePadding}>
                <Col span={8}>
                  <Card
                    title={
                      <Space>
                        <Typography.Text>{t('Output Assets List')}</Typography.Text>
                        <Divider type="vertical" />
                        <Tooltip
                          title={`total assets count is ${assets.length}, the filtered assets count is ${filteredAssets.length}`}
                        >
                          <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
                            {filteredAssets.length} / {assets.length}
                          </Typography.Text>
                        </Tooltip>
                        <Divider type="vertical" />
                        <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
                          {formatSize(sumBy(filteredAssets, (e) => e.size))}
                        </Typography.Text>
                      </Space>
                    }
                    size="small"
                    bodyStyle={{ overflow: 'scroll', height: fold ? cardBodyHeight : largeCardBodyHeight }}
                    extra={
                      <Button size="small" icon={<ColumnHeightOutlined />} onClick={() => setDefaultExpandAll(true)}>
                        expand all
                      </Button>
                    }
                  >
                    <FileTree
                      treeData={assetsStructures}
                      autoExpandParent
                      defaultExpandAll={defaultExpandAll || filteredAssets.length <= 20}
                      key={`tree_${inputAssetName}_${defaultExpandAll}`}
                    />
                  </Card>
                </Col>
                <Col span={16}>
                  {assetPath ? (
                    <ServerAPIProvider api={SDK.ServerAPI.API.GetAssetDetails} body={{ assetPath }}>
                      {(details) => (
                        <AssetDetail
                          asset={details.asset}
                          chunks={details.chunks}
                          modules={details.modules}
                          height={fold ? cardBodyHeight : largeCardBodyHeight}
                          moduleSizeLimit={inputModule}
                          root={cwd}
                        />
                      )}
                    </ServerAPIProvider>
                  ) : (
                    <Card bodyStyle={{ height: fold ? cardBodyHeight + 40 : largeCardBodyHeight }}>
                      <Empty
                        description={
                          <Typography.Text strong>
                            Click the file path on the left to show the modules of the asset
                          </Typography.Text>
                        }
                      />
                    </Card>
                  )}
                </Col>
              </Row>
            ) : (
              <Empty />
            )}
          </Col>
        </Row>
      </Card>
    </React.Fragment>

  );
};

export const WebpackModulesOverall = withServerAPI({
  api: SDK.ServerAPI.API.GetProjectInfo,
  responsePropName: 'project',
  Component: (props: { project: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetProjectInfo> }) => {
    const { root, errors } = props.project;
    return (
      <ServerAPIProvider api={SDK.ServerAPI.API.GetAssetsSummary} body={{ withFileContent: true }}>
        {(summary) => {
          return (
            <ServerAPIProvider api={SDK.ServerAPI.API.GetEntryPoints}>
              {(entryPoints) => (
                <WebpackModulesOverallBase cwd={root} errors={errors} summary={summary} entryPoints={entryPoints} />
              )}
            </ServerAPIProvider>
          );
        }}
      </ServerAPIProvider>
    );
  },
});
