import { SDK } from '@rsdoctor/types';
import { Col, Empty, Row } from 'antd';
import React, { memo, useMemo } from 'react';
import { getShortPath } from '../../utils';
import { FileTree } from './components/fileTreeCom';
import './index.sass';
import { Lodash } from '@rsdoctor/utils/common';

const DependencyTree: React.FC<{
  module: SDK.ModuleData;
  dependencies: SDK.DependencyData[];
  cwd: string;
}> = ({ dependencies, cwd, module }) => {
  const treedata = useMemo(() => {
    const dpTreeData = module.dependencies.map((dpId) => {
      const dp = dependencies.find((_dp) => _dp.id === dpId);
      if (!dp) return;
      return {
        __RESOURCEPATH__: dp.resolvedRequest || '',
        id: dp.dependency,
        key: dp.resolvedRequest,
        name: getShortPath(dp.resolvedRequest) || '',
        level: 1,
        kind: dp.kind,
        concatModules: undefined,
      };
    });
    return Lodash.compact(dpTreeData);
  }, [module]);

  return (
    <Row justify="start" align="middle">
      <Col span={24}>
        {treedata.length ? (
          <FileTree treeData={treedata} needJumpto cwd={cwd} />
        ) : (
          <Empty />
        )}
      </Col>
    </Row>
  );
};

export default memo(DependencyTree);
