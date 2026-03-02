import { SDK } from '@rsdoctor/types';
import { Card, Col, Empty, Popover, Tooltip, Typography } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { Size } from 'src/constants';
import { openVSCode, openCursor, openTrae } from 'src/components/Opener';
import { CodeViewer } from 'src/components/base';
import VSCodeIcon from '../../common/svg/vscode.svg';
import CursorIcon from '../../common/svg/cursor.svg';
import TraeIcon from '../../common/svg/trae.svg';
import { FileTree } from './components/fileTreeCom';
import { clsNamePrefix } from './constants';
import DependencyTree from './dependency';
import { getImporteds } from './utils';
import { useCreateFileTreeData } from './utils/hooks';
import { TabList } from './index';

export const BailoutReasonCard: React.FC<{
  reasons?: string[];
  sideEffectCodes?: SDK.SideEffectCodeData[];
  modulePath?: string;
}> = ({ reasons, sideEffectCodes, modulePath }) => {
  if (
    (!reasons || !reasons.length) &&
    (!sideEffectCodes || !sideEffectCodes.length)
  ) {
    return (
      <Card
        className={`${clsNamePrefix}-bailout-card`}
        bordered={false}
        bodyStyle={{ padding: 20, height: '100%' }}
      >
        <Empty />
      </Card>
    );
  }

  return (
    <Card
      className={`${clsNamePrefix}-bailout-card`}
      bordered={false}
      bodyStyle={{ padding: 20, height: '100%' }}
    >
      {reasons && (
        <>
          <Typography.Text
            strong
            className={`${clsNamePrefix}-bailout-card-title`}
          >
            Bailout Reasons
          </Typography.Text>
          <div
            className={`${clsNamePrefix}-bailout-card-list`}
            style={{ maxHeight: 156, overflowY: 'auto' }}
          >
            {reasons.length > 0 ? (
              reasons.map((reason, index) => (
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
              ))
            ) : (
              <Empty />
            )}
          </div>
        </>
      )}
      {sideEffectCodes && sideEffectCodes.length > 0 && (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: reasons?.length ? 12 : 0,
            }}
          >
            <Typography.Text
              strong
              className={`${clsNamePrefix}-bailout-card-title`}
            >
              Side Effect Codes
            </Typography.Text>
            {modulePath && sideEffectCodes[0] && (
              <Tooltip
                title={`Open in VSCode: line ${sideEffectCodes[0].startLine}`}
              >
                <VSCodeIcon
                  style={{
                    width: 16,
                    height: 16,
                    cursor: 'pointer',
                    flexShrink: 0,
                    marginBottom: 12,
                  }}
                  onClick={() =>
                    openVSCode({
                      file: modulePath,
                      line: sideEffectCodes[0].startLine,
                    })
                  }
                />
              </Tooltip>
            )}
            {modulePath && sideEffectCodes[0] && (
              <Tooltip
                title={`Open in Cursor: line ${sideEffectCodes[0].startLine}`}
              >
                <CursorIcon
                  style={{
                    width: 16,
                    height: 16,
                    cursor: 'pointer',
                    flexShrink: 0,
                    marginBottom: 12,
                  }}
                  onClick={() =>
                    openCursor({
                      file: modulePath,
                      line: sideEffectCodes[0].startLine,
                    })
                  }
                />
              </Tooltip>
            )}
            {modulePath && sideEffectCodes[0] && (
              <Tooltip
                title={`Open in Trae: line ${sideEffectCodes[0].startLine}`}
              >
                <TraeIcon
                  style={{
                    width: 16,
                    height: 16,
                    cursor: 'pointer',
                    flexShrink: 0,
                    marginBottom: 12,
                  }}
                  onClick={() =>
                    openTrae({
                      file: modulePath,
                      line: sideEffectCodes[0].startLine,
                    })
                  }
                />
              </Tooltip>
            )}
          </div>
          <div
            className={`${clsNamePrefix}-bailout-card-list`}
            style={{
              minHeight: '50vh',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              overflow: 'auto',
            }}
          >
            {sideEffectCodes.map((item, index) => (
              <div
                className={`${clsNamePrefix}-bailout-card-item`}
                key={`${item.moduleId}-${index}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 8,
                  minHeight: 0,
                  flex: '1 1 0',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {item.code ? (
                    <CodeViewer
                      code={item.code}
                      ranges={[
                        {
                          start: {
                            line: item.startLine || 0,
                            column: 0,
                          },
                        },
                      ]}
                      filePath={''}
                      lang="javascript"
                      style={{ flex: 1, minHeight: '40vh', width: '100%' }}
                      isLightTheme={false}
                      formatOnMount
                    />
                  ) : (
                    <Empty />
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
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
