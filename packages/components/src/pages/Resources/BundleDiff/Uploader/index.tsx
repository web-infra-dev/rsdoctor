import { InboxOutlined } from '@ant-design/icons';
import {
  fetchJSONByUrls,
  readJSONByFileReader,
} from '@rsdoctor/components/utils';
import { Chunks, ModuleGraph } from '@rsdoctor/graph/transform-bundle';
import { ChunkGraph, PackageGraph } from '@rsdoctor/graph';
import type { Common, Plugin } from '@rsdoctor/types';
import { Constants, Manifest, SDK } from '@rsdoctor/types';
import { Bundle } from '@rsdoctor/utils/common';
import {
  Alert,
  Button,
  Space,
  Tag,
  Typography,
  Upload,
  UploadFile,
  message,
} from 'antd';
import { isArray } from 'lodash-es';
import React, { useCallback, useRef, useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Size } from '../../../../constants';

import './index.scss';

export function isWebpackStats(
  json: Common.PlainObject,
): json is Plugin.StatsCompilation {
  return (
    json.hash &&
    isArray(json.assets) &&
    isArray(json.chunks) &&
    isArray(json.modules)
  );
}

export async function loadWebpackStats(
  jsons: Plugin.StatsCompilation[],
): Promise<Manifest.RsdoctorManifest[]> {
  const res = await Promise.all(
    jsons.map(async (json) => {
      const chunkGraph: ChunkGraph = Chunks.chunkTransform(new Map(), json);
      const moduleGraph = ModuleGraph.getModuleGraphByStats(
        json,
        '.',
        chunkGraph,
      );
      const assetsModuleMap =
        (await Chunks.getAssetsModulesData(
          moduleGraph,
          chunkGraph,
          json.outputPath || '',
          {},
        )) || {};
      Chunks.transformAssetsModulesData(assetsModuleMap, moduleGraph);
      const pkgGraph = PackageGraph.fromModuleGraph(moduleGraph, '.');

      return {
        hash: json.hash || '',
        moduleGraph: await moduleGraph.toData(),
        chunkGraph: chunkGraph.toData(SDK.ToDataType.Normal),
        packageGraph: pkgGraph.toData(),
      } as Pick<
        SDK.StoreData,
        'moduleGraph' | 'chunkGraph' | 'hash' | 'packageGraph'
      >;
    }),
  );

  return res.map((e) => {
    return {
      client: {
        enableRoutes: [],
      },
      data: {
        pid: 0,
        root: '',
        errors: [],
        configs: [],
        plugin: {},
        summary: {
          costs: [],
        },
        envinfo: {} as SDK.EnvInfo,
        resolver: [],
        loader: [],
        moduleCodeMap: {},
        ...e,
      },
    };
  });
}

const type = 'JSON';

interface DragableUploadListItemProps {
  originNode: React.ReactElement<
    any,
    string | React.JSXElementConstructor<any>
  >;
  file: UploadFile;
  fileList: UploadFile[];
  moveRow: (dragIndex: number, hoverIndex: number) => void;
  setManifests: React.Dispatch<
    React.SetStateAction<Manifest.RsdoctorManifest[]>
  >;
}

const DiffButton: React.FC<{
  fileList: UploadFile[];
  setManifests: React.Dispatch<
    React.SetStateAction<Manifest.RsdoctorManifest[]>
  >;
}> = ({ fileList, setManifests }) => {
  return (
    <Button
      type="primary"
      style={{ width: '100%', marginTop: Size.BasePadding }}
      onClick={async () => {
        if (fileList.length !== 2) {
          return message.error('Must upload 2 files for bundle diff.');
        }

        const files = await Promise.all(
          fileList.map(async (file) => {
            const json = await readJSONByFileReader(file);

            return {
              name: file.name,
              json,
            };
          }),
        );

        // all are webpack stats
        if (files.every((e) => isWebpackStats(e.json))) {
          const manifests = await loadWebpackStats(
            files.map((e) => e.json),
          ).catch((err: Error) => {
            message.error(`load json error: ${err.message}`);
            throw err;
          });
          setManifests(manifests);
          return;
        }

        const data = files.map((e) => {
          return {
            name: e.name,
            url: (e.json as Manifest.RsdoctorManifestWithShardingFiles)
              .cloudManifestUrl,
          };
        });
        const invalid = data.find((e) => !e.url);
        if (invalid) {
          message.error(
            `${invalid.name} is invalid! Please check your webpack config, stats file must has 'hash', 'version', 'assets', 'chunks', 'modules' property.`,
          );
        } else {
          const urls = data.map((e) => e.url!);
          // make sure the json can be load successful.
          await fetchJSONByUrls(urls);
          const url = Bundle.getBundleDiffPageUrl(urls);
          // window.open(url);
          location.href = url;
        }
      }}
    >
      Start Diff
    </Button>
  );
};

const DragableUploadListItem = ({
  originNode,
  moveRow,
  file,
  fileList,
  setManifests,
}: DragableUploadListItemProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const index = fileList.indexOf(file);
  const [{ isOver, dropClassName }, drop] = useDrop({
    accept: type,
    collect: (monitor: {
      getItem: () => { index?: number };
      isOver: () => boolean;
    }) => {
      const item = monitor.getItem() || {};
      const dragIndex = item.index;
      if (dragIndex === index) {
        return {};
      }
      return {
        isOver: monitor.isOver(),
        dropClassName:
          dragIndex && dragIndex < index
            ? ' drop-over-downward'
            : ' drop-over-upward',
      };
    },
    drop: (item: { index: number }) => {
      moveRow(item.index, index);
    },
  });
  const [, drag] = useDrag({
    type,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  drop(drag(ref));

  return (
    <React.Fragment>
      <div
        ref={ref}
        className={`ant-upload-draggable-list-item ${isOver ? dropClassName : ''}`}
      >
        {React.cloneElement(
          originNode,
          originNode.props,
          React.Children.map(originNode.props.children, (e, i) => {
            // file name react node
            if (i === 1) {
              if (index === 0) {
                return React.cloneElement(e, e.props, [
                  file.name,
                  <Tag
                    color="#1677ff"
                    style={{ marginLeft: Size.BasePadding / 2 }}
                    key="tag"
                  >
                    Baseline
                  </Tag>,
                ]);
              }
            }
            return e;
          }),
        )}
      </div>
      {index === fileList.length - 1 ? (
        <DiffButton fileList={fileList} setManifests={setManifests} />
      ) : null}
    </React.Fragment>
  );
};

export const BundleFileUploader: React.FC<
  React.PropsWithChildren<{
    setManifests: React.Dispatch<
      React.SetStateAction<Manifest.RsdoctorManifest[]>
    >;
  }>
> = ({ setManifests, children }) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const moveRow = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      const dragRow = fileList[dragIndex];
      const files = fileList.slice();
      files.splice(dragIndex, 1);
      files.splice(hoverIndex, 0, dragRow);
      setFileList(files);
    },
    [fileList],
  );

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Alert
        type="warning"
        showIcon
        message={
          <Typography.Text>
            <Typography.Text>{'If you use'}</Typography.Text>
            <Typography.Text code strong>
              {'.rsdoctor/manifest.json'}
            </Typography.Text>
            <Typography.Text>{', please use the'}</Typography.Text>
            <Typography.Text code strong>
              {'.rsdoctor/manifest.json'}
            </Typography.Text>
            <Typography.Text>{'file built by the plugin'}</Typography.Text>
            <Typography.Text code strong>
              {'@byted/rsdoctor'}
            </Typography.Text>
          </Typography.Text>
        }
      />
      <Alert
        type="info"
        showIcon
        message={
          <Typography.Text>
            <Typography.Text>
              Rsdoctor will emit the profile json to{' '}
            </Typography.Text>
            <Typography.Text code strong>
              {Constants.RsdoctorOutputManifestPath}
            </Typography.Text>
            <Typography.Text>
              {' '}
              in your output folder when you have integrated with the Rsdoctor.
            </Typography.Text>
          </Typography.Text>
        }
      />
      <Alert
        type="info"
        showIcon
        message={
          <Typography.Text>
            <Typography.Text>You can upload </Typography.Text>
            <Typography.Text
              strong
              code
            >{`"${Constants.RsdoctorOutputManifestPath}"`}</Typography.Text>
            <Typography.Text> or </Typography.Text>
            <Typography.Text strong code>
              webpack stats.json
            </Typography.Text>
            <Typography.Text>
              {' '}
              to view the diff result for bundle.
            </Typography.Text>
          </Typography.Text>
        }
      />
      <DndProvider backend={HTML5Backend}>
        <Upload.Dragger
          fileList={fileList}
          className={`bundle-diff-uploader ${fileList.length ? 'bundle-diff-uploader_valid' : ''}`.trim()}
          multiple
          accept=".json"
          showUploadList
          onChange={({ fileList }) => {
            setFileList(fileList);
          }}
          height={300}
          beforeUpload={() => false}
          itemRender={(originNode, file, currFileList) => (
            <DragableUploadListItem
              setManifests={setManifests}
              originNode={originNode}
              file={file}
              fileList={currFileList}
              moveRow={moveRow}
            />
          )}
          maxCount={2}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ fontSize: 80 }} />
          </p>
          <p className="ant-upload-text">
            Click or drag json file to this area to upload and analyze your
            profile json
          </p>
          {children}
        </Upload.Dragger>
      </DndProvider>
    </Space>
  );
};
