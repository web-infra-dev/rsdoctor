import { DuplicatePackageDrawer } from '@rsdoctor/components';
import { DiffCard, Percent } from '@rsdoctor/components/elements';
import {
  useDuplicatePackagesByErrors,
  useModuleGraph,
  useUniqModules,
} from '@rsdoctor/components/utils';
import { Client } from '@rsdoctor/types';
import { Graph } from '@rsdoctor/utils/common';
import { Col, Row, Space, Typography } from 'antd';
import React from 'react';
import { Size } from 'src/constants';
import { PackagesStatistic, getPackagesTableDataSource } from './packages';
import { BundleDiffComponentCardProps } from './types';

export const DiffCards: React.FC<BundleDiffComponentCardProps> = ({
  baseline,
  current,
  assetsDiffResult,
}) => {
  // Modules
  const baselineMod = useUniqModules(baseline.moduleGraph.modules);
  const currentMod = useUniqModules(current.moduleGraph.modules);

  // Duplicate Packages
  const baselineDup = useDuplicatePackagesByErrors(baseline.errors);
  const currentDup = useDuplicatePackagesByErrors(current.errors);
  const baselineModuleGraph = useModuleGraph(baseline.moduleGraph);
  const currentModuleGraph = useModuleGraph(current.moduleGraph);
  const baselineCwd = baseline.root;
  const currentCwd = current.root;

  // Packages
  const packages = getPackagesTableDataSource({
    baseline: baseline.packageGraph,
    current: current.packageGraph,
  });

  const arr = [
    {
      title: ['Bundle Size'],
      value: [assetsDiffResult.all.total],
    },
    {
      title: ['Total JS', 'Initial JS'],
      value: [assetsDiffResult.js.total, assetsDiffResult.js.initial],
    },
    {
      title: ['Total CSS', 'Initial CSS'],
      value: [assetsDiffResult.css.total, assetsDiffResult.css.initial],
    },
    {
      title: ['Images', 'Fonts', 'Media'],
      value: [
        assetsDiffResult.imgs.total,
        assetsDiffResult.fonts.total,
        assetsDiffResult.media.total,
      ],
    },
    { title: ['HTML'], value: [assetsDiffResult.html.total] },
    { title: ['Others'], value: [assetsDiffResult.others.total] },
  ];

  return (
    <Row
      gutter={[Size.BasePadding, Size.BasePadding]}
      wrap
      style={{ marginBottom: Size.BasePadding }}
    >
      {arr.map((e) => {
        return (
          <Col key={e.title.join(',')} style={{ minWidth: 335 }}>
            <DiffCard titles={e.title} datas={e.value} showPercentInTitle />
          </Col>
        );
      })}
      <Col style={{ minWidth: 335 }}>
        <DiffCard
          titles={['Duplicate Packages']}
          datas={[
            {
              size: {
                baseline: baselineDup.length,
                current: currentDup.length,
              },
              count: {
                baseline: baselineDup.length,
                current: currentDup.length,
              },
              percent: 0,
              state: Client.RsdoctorClientDiffState.Equal,
            },
          ]}
          formatter={(_v, target) => (
            <DuplicatePackageDrawer
              duplicatePackages={
                target === 'baseline' ? baselineDup : currentDup
              }
              moduleGraph={
                target === 'baseline' ? baselineModuleGraph : currentModuleGraph
              }
              cwd={target === 'baseline' ? baselineCwd : currentCwd}
              buttonProps={{ size: 'small' }}
              moduleCodeMap={
                target === 'baseline'
                  ? baseline.moduleCodeMap
                  : current.moduleCodeMap
              }
            />
          )}
        />
      </Col>
      <Col style={{ minWidth: 335 }}>
        <DiffCard
          titles={['Modules']}
          datas={[
            {
              size: {
                baseline: baselineMod.length,
                current: currentMod.length,
              },
              count: {
                baseline: baselineMod.length,
                current: currentMod.length,
              },
              percent: 0,
              state: Client.RsdoctorClientDiffState.Equal,
            },
          ]}
          formatter={(v, t) => {
            if (t === 'baseline') return v;

            const diff = Graph.diffSize(baselineMod.length, currentMod.length);

            return (
              <Space style={{ fontSize: 'inherit' }}>
                <Typography.Text style={{ fontSize: 'inherit' }}>
                  {v}
                </Typography.Text>
                <Percent {...diff} />
              </Space>
            );
          }}
        />
      </Col>
      <Col style={{ minWidth: 335 }}>
        <DiffCard
          titles={[
            <Space key="0">
              <Typography.Text style={{ color: 'inherit' }}>
                Packages
              </Typography.Text>
              <PackagesStatistic dataSource={packages} />
            </Space>,
          ]}
          datas={[
            {
              size: {
                baseline: packages.filter((e) => e.baseline).length,
                current: packages.filter((e) => e.current).length,
              },
              count: {
                baseline: packages.filter((e) => e.baseline).length,
                current: packages.filter((e) => e.current).length,
              },
              percent: 0,
              state: Client.RsdoctorClientDiffState.Equal,
            },
          ]}
          formatter={(v, t) => (t === 'baseline' ? v : <Space>{v}</Space>)}
        />
      </Col>
    </Row>
  );
};
