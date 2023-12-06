import { SDK } from '@rsdoctor/types';
import { Empty, Table, Tag } from 'antd';
import { compact, orderBy } from 'lodash-es';
import React, { useMemo } from 'react';
import { formatSize } from 'src/utils';
import './index.sass';

type ChunksDataType = {
  key: string | number;
  name: JSX.Element;
  size: JSX.Element;
  entry: JSX.Element;
  assets: JSX.Element[];
};

const columns = [
  {
    title: 'Chunk Name',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: 'size | 大小',
    dataIndex: 'size',
    key: 'size',
  },
  {
    title: 'assets | 资源',
    dataIndex: 'assets',
    key: 'assets',
  },
  {
    title: 'Entry or Not | 是否是入口',
    dataIndex: 'entry',
    key: 'entry',
  },
];

export const ChunksTable: React.FC<{
  chunks: SDK.ChunkData[];
}> = ({ chunks }) => {
  const chunksData = useMemo(() => {
    const _chunksData: (ChunksDataType | undefined)[] = chunks.map((chunk) => {
      if (!chunk) return undefined;
      return {
        key: chunk.id,
        name: <Tag>{chunk.name}</Tag>,
        size: <Tag>{formatSize(chunk.parsedSize)}</Tag>,
        entry: <Tag>{chunk.entry ? '是 | Yes' : '否 | No'}</Tag>,
        assets: chunk.assets.map((asset) => (
          <p key={asset}>
            <Tag key={asset}>{asset}</Tag>
          </p>
        )),
      };
    });
    return orderBy(compact(_chunksData), ['size'], ['desc']);
  }, [chunks]);

  return (
    <>
      {chunksData?.length ? <Table bordered pagination={false} dataSource={chunksData} columns={columns} /> : <Empty />}
    </>
  );
};
