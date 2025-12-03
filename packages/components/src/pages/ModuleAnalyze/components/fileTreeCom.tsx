import {
  MinusCircleOutlined,
  PlusCircleOutlined,
  RightSquareOutlined,
} from '@ant-design/icons';
import { Popover, Space, Typography } from 'antd';
import React, { useCallback, useEffect, useRef } from 'react';
import Tree, { DefaultNodeProps, useTreeState } from 'react-hyper-tree';

import { ModuleGraphListContext } from '../../BundleSize/config';
import { NewTreeNodeType } from '../utils/hooks';
import './fileTreeCom.scss';
import { getFileCom } from 'src/components/FileTree';

const prefix = 'file-tree-com';

type FileTreeProps = {
  treeData: NewTreeNodeType[];
  needCode?: boolean;
  needShowAllTree?: boolean;
  needJumpto?: boolean;
  defaultOpened?: boolean;
  defaultOpenFather?: number;
  cwd: string;
  selectedChunk?: string;
};

export const FileTree: React.FC<FileTreeProps> = (props) => {
  const { treeData, needJumpto = false, defaultOpenFather = 0 } = props;

  const { required, handlers } = useTreeState({
    id: `${prefix}-tree`,
    data: treeData || [],
    defaultOpened: false,
    multipleSelect: false,
    refreshAsyncNodes: true,
  });

  const expandedNodes = useRef<Set<string | number>>(new Set());

  useEffect(() => {
    expandedNodes.current.clear();
  }, [treeData]);

  const renderNode = useCallback(
    ({ node, onToggle }: DefaultNodeProps) => {
      if (
        typeof node.data !== 'object' ||
        node.data === null ||
        Array.isArray(node.data)
      ) {
        return null;
      }

      const hasChildren =
        typeof node.data.getChildren === 'function' ||
        (Array.isArray(node.data.children) && node.data.children.length > 0);

      if (
        defaultOpenFather > 0 &&
        typeof node.data.level === 'number' &&
        node.data.level < defaultOpenFather &&
        hasChildren
      ) {
        const nodeId = node.id;
        if (!expandedNodes.current.has(nodeId)) {
          expandedNodes.current.add(nodeId);
          requestAnimationFrame(() => {
            handlers.setOpen(nodeId, true);
          });
        }
      }

      const Icon = getFileCom(node.data.name);

      return (
        <div className={`${prefix}-titles-box`} key={node.data.name}>
          <div className={`${prefix}-titles`}>
            <Space direction="vertical">
              <div className={`${prefix}-node-title`}>
                <Space>
                  <div onClick={onToggle}>
                    <Space>
                      {(() => {
                        const hasChildren =
                          typeof node.data.getChildren === 'function' ||
                          (Array.isArray(node.data.children) &&
                            node.data.children.length > 0);
                        return !node.options.opened && hasChildren ? (
                          <PlusCircleOutlined style={{ color: 'lightblue' }} />
                        ) : (
                          <MinusCircleOutlined style={{ color: 'lightblue' }} />
                        );
                      })()}
                      {Icon}
                      <Popover
                        key={`${node.data.name}popover`}
                        content={
                          <>
                            {node.data.__RESOURCEPATH__ ? (
                              <Typography.Text
                                key={`${node.data.name}-popover-path`}
                                code
                              >
                                {node.data.__RESOURCEPATH__}
                              </Typography.Text>
                            ) : (
                              <></>
                            )}
                          </>
                        }
                        title="INFO"
                        trigger="hover"
                      >
                        <Typography.Text>{node.data.name}</Typography.Text>
                      </Popover>
                    </Space>
                  </div>
                  <Space>
                    {needJumpto && (
                      <ModuleGraphListContext.Consumer>
                        {({ moduleJumpList, setModuleJumpList }) => {
                          return (
                            <RightSquareOutlined
                              onClick={() => {
                                const _list = [...moduleJumpList];
                                _list.push(+node.id);
                                setModuleJumpList(_list);
                              }}
                            />
                          );
                        }}
                      </ModuleGraphListContext.Consumer>
                    )}
                  </Space>
                </Space>
              </div>
            </Space>
          </div>
        </div>
      );
    },
    [handlers, defaultOpenFather, needJumpto],
  );

  return (
    <>
      <Tree
        {...required}
        {...handlers}
        horizontalLineStyles={{
          stroke: '#c4c4c4',
          strokeWidth: 2,
          strokeDasharray: '1 1',
        }}
        verticalLineStyles={{
          stroke: '#c4c4c4',
          strokeWidth: 2,
          strokeDasharray: '1 1',
        }}
        draggable={false}
        depthGap={14}
        gapMode={'padding'}
        disableLines={false}
        disableTransitions={true}
        disableHorizontalLines={false}
        disableVerticalLines={false}
        verticalLineTopOffset={0}
        verticalLineOffset={5}
        renderNode={renderNode}
      />
    </>
  );
};
