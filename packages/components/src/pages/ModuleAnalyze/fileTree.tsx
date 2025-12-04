import { SDK } from '@rsdoctor/types';
import { Card, Col, Empty, Popover, Typography } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { Size } from 'src/constants';
import { FileTree } from './components/fileTreeCom';
import { clsNamePrefix } from './constants';
import DependencyTree from './dependency';
import { getImporteds } from './utils';
import { useCreateFileTreeData } from './utils/hooks';
import { TabList } from './index';

export const BailoutReasonCard: React.FC<{ reasons?: string[] }> = ({
  reasons,
}) => {
  if (!reasons || !reasons.length) {
    return null;
  }
  return (
    <Card
      className={`${clsNamePrefix}-bailout-card`}
      bordered={false}
      bodyStyle={{ padding: 20 }}
    >
      <Typography.Text strong className={`${clsNamePrefix}-bailout-card-title`}>
        Bailout Reasons
      </Typography.Text>
      <div
        className={`${clsNamePrefix}-bailout-card-list`}
        style={{ maxHeight: 156, overflowY: 'auto' }}
      >
        {reasons.map((reason, index) => (
          <div
            className={`${clsNamePrefix}-bailout-card-item`}
            key={`${reason}-${index}`}
          >
            <Popover content={reason} trigger="hover">
              <Typography.Paragraph
                ellipsis={{ rows: 1 }}
                className={`${clsNamePrefix}-bailout-card-text`}
                style={{ marginBottom: 0 }}
              >
                {reason}
              </Typography.Paragraph>
            </Popover>
            <Typography.Text
              type="secondary"
              className={`${clsNamePrefix}-bailout-card-meta`}
            >
              #{String(index + 1).padStart(2, '0')}
            </Typography.Text>
          </div>
        ))}
      </div>
    </Card>
  );
};

export const ModuleFilesTree: React.FC<{
  modules: SDK.ModuleData[];
  dependencies: SDK.DependencyData[];
  curModule: SDK.ModuleData;
  cwd: string;
  selectedChunk: string;
  activeTabKey: string;
}> = (props) => {
  const {
    curModule,
    modules,
    dependencies,
    cwd,
    activeTabKey,
    selectedChunk = '',
  } = props;
  const [importedModules, setImportedModules] = useState(
    [] as SDK.ModuleData[],
  );

  const { data: fileStructures } = useCreateFileTreeData(
    modules,
    importedModules,
    curModule,
  );

  useEffect(() => {
    const importeds = getImporteds(curModule, modules);
    setImportedModules(importeds);
  }, [curModule, modules]);

  const mainContent = useMemo(() => {
    if (activeTabKey === TabList[TabList.Reasons]) {
      return importedModules ? (
        <FileTree
          cwd={cwd}
          treeData={fileStructures}
          needCode={true}
          needShowAllTree={true}
          needJumpto={true}
          selectedChunk={selectedChunk}
          defaultOpenFather={1}
        />
      ) : (
        <Empty className={`${clsNamePrefix}-empty`} />
      );
    }

    return (
      <div
        className={`${clsNamePrefix}-file-tree`}
        style={{ padding: Size.BasePadding / 2 }}
      >
        <Col span={24} style={{ marginTop: Size.BasePadding / 2 }}>
          {curModule ? (
            <DependencyTree
              module={curModule}
              dependencies={dependencies}
              cwd={cwd}
            />
          ) : (
            <Empty className={`${clsNamePrefix}-empty`} />
          )}
        </Col>
      </div>
    );
  }, [
    activeTabKey,
    curModule,
    dependencies,
    fileStructures,
    importedModules,
    cwd,
    selectedChunk,
  ]);

  return <>{mainContent}</>;
};
