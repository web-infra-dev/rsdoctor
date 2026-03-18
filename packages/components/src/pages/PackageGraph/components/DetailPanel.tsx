import React from 'react';
import {
  Badge,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Space,
  Tag,
  Typography,
} from 'antd';
import { SDK } from '@rsdoctor/types';
import { formatSize } from 'src/utils';

export interface PackageNodeInfo {
  pkg: SDK.PackageData;
  dependencies: SDK.PackageDependencyData[];
  allPackages: SDK.PackageData[];
}

interface DetailPanelProps {
  info: PackageNodeInfo | null;
  open: boolean;
  onClose: () => void;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({
  info,
  open,
  onClose,
}) => {
  if (!info) {
    return null;
  }

  const { pkg, dependencies, allPackages } = info;

  const pkgById = new Map(allPackages.map((p) => [p.id, p]));

  // packages that this package depends on
  const deps = dependencies
    .filter((d) => d.package === pkg.id)
    .map((d) => pkgById.get(d.dependency))
    .filter(Boolean) as SDK.PackageData[];

  // packages that import this package
  const importers = dependencies
    .filter((d) => d.dependency === pkg.id)
    .map((d) => pkgById.get(d.package))
    .filter(Boolean) as SDK.PackageData[];

  const isDuplicate = allPackages.filter((p) => p.name === pkg.name).length > 1;

  return (
    <Drawer
      title={
        <Space>
          <Typography.Text strong style={{ fontSize: 16 }}>
            {pkg.name}
          </Typography.Text>
          <Tag color="blue">v{pkg.version}</Tag>
          {isDuplicate && <Tag color="red">DUPLICATE</Tag>}
        </Space>
      }
      placement="left"
      width={400}
      open={open}
      onClose={onClose}
      mask={false}
      styles={{ body: { padding: 16 } }}
    >
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="Parsed Size">
          <Typography.Text strong style={{ color: '#e17055' }}>
            {formatSize(pkg.size.parsedSize)}
          </Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="Gzip Size">
          {formatSize(pkg.size.gzipSize)}
        </Descriptions.Item>
        <Descriptions.Item label="Source Size">
          {formatSize(pkg.size.sourceSize)}
        </Descriptions.Item>
        <Descriptions.Item label="Modules">
          {pkg.modules?.length ?? 0}
        </Descriptions.Item>
        <Descriptions.Item label="Root">
          <Typography.Text
            code
            style={{ fontSize: 11, wordBreak: 'break-all' }}
          >
            {pkg.root}
          </Typography.Text>
        </Descriptions.Item>
      </Descriptions>

      <Divider orientation="left" orientationMargin={0}>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          Dependencies ({deps.length})
        </Typography.Text>
      </Divider>

      {deps.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No dependencies"
        />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          {deps.map((d) => {
            const isDepDuplicate =
              allPackages.filter((p) => p.name === d.name).length > 1;
            return (
              <Space key={`${d.name}@${d.version}`}>
                {isDepDuplicate && <Badge status="error" />}
                <Typography.Text>{d.name}</Typography.Text>
                <Tag>{d.version}</Tag>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  {formatSize(d.size.parsedSize)}
                </Typography.Text>
              </Space>
            );
          })}
        </Space>
      )}

      <Divider orientation="left" orientationMargin={0}>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          Imported By ({importers.length})
        </Typography.Text>
      </Divider>

      {importers.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Not imported by any package"
        />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          {importers.map((p) => (
            <Space key={`${p.name}@${p.version}`}>
              <Typography.Text>{p.name}</Typography.Text>
              <Tag>{p.version}</Tag>
            </Space>
          ))}
        </Space>
      )}

      {pkg.duplicates && pkg.duplicates.length > 0 && (
        <>
          <Divider orientation="left" orientationMargin={0}>
            <Typography.Text type="danger" style={{ fontSize: 13 }}>
              Cross-chunk Duplicates ({pkg.duplicates.length})
            </Typography.Text>
          </Divider>
          <Space direction="vertical" style={{ width: '100%' }}>
            {pkg.duplicates.map((dup, i) => (
              <Typography.Text
                key={i}
                type="secondary"
                style={{ fontSize: 12 }}
              >
                {dup.chunks.map((c) => c.name).join(', ')}
              </Typography.Text>
            ))}
          </Space>
        </>
      )}
    </Drawer>
  );
};
