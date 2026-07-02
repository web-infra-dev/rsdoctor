import { CodeOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { type Client, SDK } from '@rsdoctor/shared/types';
import {
  Card,
  Checkbox,
  Col,
  Divider,
  Empty,
  InputNumber,
  Row,
  Select,
  Space,
  Tooltip,
  Typography,
} from 'antd';
import { debounce, sumBy } from '@rsdoctor/shared/collection';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useCodeDrawer } from 'src/components/base/CodeViewer/useCodeDrawer';
import { Badge as Bdg } from '../../../components/Badge';
import { FileTree } from '../../../components/FileTree';
import { KeywordInput } from '../../../components/Form/keyword';
import { Keyword } from '../../../components/Keyword';
import { ServerAPIProvider } from '../../../components/Manifest';
import { Size } from '../../../constants';
import { createFileStructures, formatSize, useI18n } from '../../../utils';
import { AssetDetail } from './asset';
import styles from './index.module.scss';
import './index.sass';
import { SearchModal } from './search-modal';
import { isJavaScriptAsset } from '../../../utils/assets';

const { Option } = Select;

export const TreeGraph = memo(
  ({
    cwd,
    summary,
    entryPoints,
  }: {
    cwd: string;
    summary: Client.RsdoctorClientAssetsSummary;
    entryPoints: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetEntryPoints>;
  }) => {
    const [selectedEntryPoints, setEntryPoints] = useState<
      SDK.EntryPointData[]
    >([]);
    const [inputModule, setModuleValue] = useState(0);
    const [inputAssetName, setAssetName] = useState('');
    const [inputAssetSize, setAssetSize] = useState(0);
    const [defaultExpandAll, setDefaultExpandAll] = useState(false);
    const [inputModuleUnit, setModuleUnit] = useState('');
    const [inputChunkUnit, setChunkUnit] = useState('');
    const [showOnlyJavaScriptAssets, setShowOnlyJavaScriptAssets] =
      useState(false);
    const [assetPath, setAssetPath] = useState<string | null>(null);
    const { showCode, codeDrawerComponent } = useCodeDrawer(
      'Do not have the codes of assets. If you use the lite or brief mode, there will have codes.',
    );

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
        const count =
          inputModuleUnit === 'mb' ? newValue * 1024 * 1024 : newValue * 1024;
        setModuleValue(count);
      }, 300),
      [],
    );

    const onChangeAsset = useCallback(
      debounce((newValue: number) => {
        const count =
          inputChunkUnit === 'mb' ? newValue * 1024 * 1024 : newValue * 1024;
        setAssetSize(count);
      }, 300),
      [],
    );

    const filteredAssets = useMemo(() => {
      let res = assets.slice();

      if (inputAssetName) {
        res = res.filter((e) => e.path.indexOf(inputAssetName) > -1);
      }

      if (showOnlyJavaScriptAssets) {
        res = res.filter((e) => isJavaScriptAsset(e.path));
      }

      if (inputAssetSize > 0) {
        res = res.filter((e) => e.size >= inputAssetSize);
      }

      if (selectedEntryPoints.length) {
        res = res.filter((e) => {
          if (selectedEntryPoints.some((ep) => ep.assets.includes(e.path))) {
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
    }, [
      assets,
      selectedEntryPoints,
      inputAssetName,
      inputAssetSize,
      showOnlyJavaScriptAssets,
    ]);

    useEffect(() => {
      if (assetPath && filteredAssets.some((f) => f.path === assetPath)) {
        return;
      }

      const nextAsset =
        filteredAssets.find((f) => isJavaScriptAsset(f.path)) ??
        filteredAssets[0];

      setAssetPath(nextAsset?.path ?? null);
    }, [assetPath, filteredAssets]);

    const assetsStructures = useMemo(() => {
      const res = createFileStructures({
        files: filteredAssets.map((e) => e.path).filter(Boolean),
        fileTitle(file, basename) {
          const target = filteredAssets.find((e) => e.path === file)!;
          const { size, initial, path, content } = target;

          return (
            <div
              className={styles.assetBox}
              onClick={() => {
                setAssetPath(path);
              }}
            >
              <Keyword
                text={basename}
                keyword={''}
                className={styles.fileText}
              />
              <Space size="small" className={styles.assetsTag}>
                <Divider type="vertical" />
                <Typography.Text style={{ color: '#4FD233' }}>
                  {formatSize(size)}
                </Typography.Text>
                <Divider type="vertical" />
                {initial ? (
                  <Typography.Text style={{ color: '#009A9E' }}>
                    initial
                  </Typography.Text>
                ) : null}
                <CodeOutlined
                  style={{ fontSize: 14, padding: 0 }}
                  onClick={() => showCode({ code: content!, filePath: path })}
                />
              </Space>
            </div>
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
      <>
        <div className={styles.treeGraph}>
          <Row align="middle" gutter={[Size.BasePadding, Size.BasePadding]}>
            {entryPoints && entryPoints.length ? (
              <Col>
                <Select
                  mode="multiple"
                  value={selectedEntryPoints.map((e) => e.name)}
                  style={{
                    minWidth: 230,
                    width: 'auto',
                    maxWidth: 300,
                  }}
                  placeholder={'filter assets by entry point'}
                  onChange={(name: string[]) => {
                    setEntryPoints(
                      name
                        .map((e) => entryPoints.find((ep) => ep.name === e)!)
                        .filter(Boolean),
                    );
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
                          <Bdg
                            label={e.name}
                            value={formatSize(e.size)}
                            tooltip={e.name}
                          />
                        </Space>
                      </Select.Option>
                    );
                  })}
                </Select>
              </Col>
            ) : null}
            <Col>
              <KeywordInput
                placeholder="search asset by keyword"
                onChange={onSearch}
              />
            </Col>
            <Col>
              <Checkbox
                checked={showOnlyJavaScriptAssets}
                onChange={(e) => {
                  setShowOnlyJavaScriptAssets(e.target.checked);
                  setDefaultExpandAll(false);
                }}
              >
                JS only
              </Checkbox>
            </Col>
            <Col span={6}>
              <InputNumber
                min={0}
                style={{ width: '95%' }}
                addonBefore={
                  <Space>
                    <Typography.Text style={{ fontSize: 14, color: 'inherit' }}>
                      Asset Size
                    </Typography.Text>
                    <Tooltip
                      title={t(
                        'filter the output assets which size is greater than the input value',
                      )}
                      style={{ marginLeft: 3 }}
                    >
                      <InfoCircleOutlined
                        style={{ color: 'var(--text-color-secondary)' }}
                      />
                    </Tooltip>
                  </Space>
                }
                onChange={(value) => onChangeAsset(Number(value))}
                addonAfter={selectAfter('chunk')}
              />
            </Col>
            <Col span={6}>
              <InputNumber
                min={0}
                style={{ width: '95%' }}
                addonBefore={
                  <Space>
                    <Typography.Text style={{ fontSize: 14, color: 'inherit' }}>
                      Module Size
                    </Typography.Text>
                    <Tooltip
                      title={t(
                        'filter the modules which size is greater than the input value',
                      )}
                      style={{ marginLeft: 3 }}
                    >
                      <InfoCircleOutlined
                        style={{ color: 'var(--text-color-secondary)' }}
                      />
                    </Tooltip>
                  </Space>
                }
                onChange={(value) => {
                  onChangeModule(Number(value));
                }}
                addonAfter={selectAfter('module')}
              />
            </Col>
          </Row>
          <Row>
            <SearchModal />
          </Row>
          {filteredAssets.length ? (
            <div className={styles.assetDetailRoot}>
              <div className={styles.assetDetailCol}>
                <Card
                  className={styles.assetDetailFileTreeRoot}
                  classNames={{
                    body: styles.assetDetailFileTreeBody,
                  }}
                  title={
                    <Space>
                      <Typography.Text>
                        {t('Output Assets List')}
                      </Typography.Text>
                      <Divider type="vertical" />
                      <Tooltip
                        title={`total assets count is ${assets.length}, the filtered assets count is ${filteredAssets.length}`}
                      >
                        <Typography.Text
                          type="secondary"
                          style={{
                            fontSize: 12,
                            fontWeight: 400,
                          }}
                        >
                          {filteredAssets.length} / {assets.length}
                        </Typography.Text>
                      </Tooltip>
                      <Divider type="vertical" />
                      <Typography.Text
                        type="secondary"
                        style={{ fontSize: 12, fontWeight: 400 }}
                      >
                        {formatSize(sumBy(filteredAssets, (e) => e.size))}
                      </Typography.Text>
                    </Space>
                  }
                  size="small"
                >
                  <div className={styles.assetDetailFileTreeViewport}>
                    <div className={styles.assetDetailFileTreeScrollArea}>
                      <FileTree
                        className={styles.assets}
                        treeData={assetsStructures}
                        autoExpandParent
                        defaultExpandAll={
                          defaultExpandAll || filteredAssets.length <= 20
                        }
                        key={`tree_${inputAssetName}_${defaultExpandAll}`}
                      />
                    </div>
                  </div>
                </Card>
              </div>
              <div className={styles.assetDetailCol}>
                {assetPath ? (
                  <ServerAPIProvider
                    api={SDK.ServerAPI.API.GetAssetDetails}
                    body={{ assetPath }}
                  >
                    {(details) => (
                      <AssetDetail
                        asset={details.asset}
                        chunks={details.chunks}
                        modules={details.modules}
                        moduleSizeLimit={inputModule}
                        root={cwd}
                      />
                    )}
                  </ServerAPIProvider>
                ) : (
                  <Card>
                    <Empty
                      description={
                        <Typography.Text strong>
                          Click the file path on the left to show the modules of
                          the asset
                        </Typography.Text>
                      }
                    />
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <Empty />
          )}
        </div>
        {codeDrawerComponent}
      </>
    );
  },
);
