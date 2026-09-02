import { SDK } from '@rsdoctor/shared/types';
import { Empty, Table, Tag } from 'antd';
import { orderBy } from '@rsdoctor/shared/collection';
import React, { useMemo } from 'react';
import { formatSize } from 'src/utils';
import './index.scss';
import { Lodash } from '@rsdoctor/shared/common-browser';

type ChunksDataType = {
  key: string | number;
  name: React.JSX.Element;
  size: React.JSX.Element;
  entry: React.JSX.Element;
  assets: React.JSX.Element[];
};

const columns = [
  {
    title: 'Chunk Name',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: 'Size',
    dataIndex: 'size',
    key: 'size',
  },
  {
    title: 'Assets',
    dataIndex: 'assets',
    key: 'assets',
  },
  {
    title: 'Entry',
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
        entry: <Tag>{chunk.entry ? 'Yes' : 'No'}</Tag>,
        assets: chunk.assets.map((asset) => (
          <p key={asset}>
            <Tag key={asset}>{asset}</Tag>
          </p>
        )),
      };
    });
    return orderBy(Lodash.compact(_chunksData), ['size'], ['desc']);
  }, [chunks]);

  return (
    <>
      {chunksData?.length ? (
        <Table
          bordered
          pagination={false}
          dataSource={chunksData}
          columns={columns}
        />
      ) : (
        <Empty />
      )}
    </>
  );
};
