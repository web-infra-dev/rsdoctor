import {
  InfoCircleOutlined,
  MinusCircleOutlined,
  PlusCircleOutlined,
  RightSquareTwoTone,
} from '@ant-design/icons';
import { Popover, Space, Typography } from 'antd';
import React, { useCallback } from 'react';
import Tree, { DefaultNodeProps, useTreeState } from 'react-hyper-tree';

import { ModuleGraphListContext } from '../../BundleSize/config';
import { NewTreeNodeType } from '../utils/hooks';
import './fileTreeCom.scss';

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
  const {
    treeData,
    needJumpto = false,
    defaultOpened = false,
    defaultOpenFather = 0,
  } = props;

  const { required, handlers } = useTreeState({
    id: `${prefix}-tree`,
    data: treeData || [],
    defaultOpened,
    multipleSelect: false,
    refreshAsyncNodes: true,
  });

  const renderNode = useCallback(({ node, onToggle }: DefaultNodeProps) => {
    defaultOpenFather &&
      node.data.level < defaultOpenFather &&
      node.setOpened(true);

    return (
      <div className={`${prefix}-titles-box`} key={node.data.name}>
        <div className={`${prefix}-titles`}>
          <Space direction="vertical">
            <div className={`${prefix}-node-title`}>
              <Space>
                <div onClick={onToggle}>
                  <Space>
                    {!node.options.opened && node.data.children?.length ? (
                      <PlusCircleOutlined style={{ color: 'lightblue' }} />
                    ) : (
                      <MinusCircleOutlined style={{ color: 'lightblue' }} />
                    )}
                    <Typography.Text>
                      {node.data.name}
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
                        <InfoCircleOutlined style={{ marginLeft: 4 }} />
                      </Popover>
                    </Typography.Text>
                  </Space>
                </div>
                <Space>
                  {needJumpto && (
                    <ModuleGraphListContext.Consumer>
                      {({ moduleJumpList, setModuleJumpList }) => {
                        return (
                          <RightSquareTwoTone
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
  }, []);

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
