import { SDK } from '@rsdoctor/types';
import { Col, Empty, Tag, Popover } from 'antd';
import React, { useEffect, useState } from 'react';
import { Size } from 'src/constants';
import { FileTree } from './components/fileTreeCom';
import { clsNamePrefix } from './constants';
import DependencyTree from './dependency';
import { getImporteds } from './utils';
import { useCreateFileTreeData } from './utils/hooks';
import { TabList } from './index';

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

  return (
    <>
      {activeTabKey === TabList[TabList.Reasons] ? (
        <>
          {importedModules ? (
            <FileTree
              cwd={cwd}
              treeData={fileStructures}
              needCode={true}
              needShowAllTree={true}
              needJumpto={true}
              selectedChunk={selectedChunk}
            />
          ) : (
            <Empty className={`${clsNamePrefix}-empty`} />
          )}
        </>
      ) : activeTabKey === TabList[TabList.Dependencies] ? (
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
      ) : (
        <div>
          {curModule.bailoutReason?.map((reason) => (
            <div style={{ marginBottom: 10 }}>
              <Tag key={reason}>
                <Popover content={reason}>
                  <span style={{ display: 'inline-block' }}>
                    {reason.length > 120
                      ? `${reason.slice(0, 120)}...`
                      : reason}
                  </span>
                </Popover>
              </Tag>
            </div>
          ))}
        </div>
      )}
    </>
  );
};
