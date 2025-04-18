import { Drawer, Empty } from 'antd';
import { useState } from 'react';
import { DiffViewer } from '.';

/**
 * 使用抽屉展示代码 diff 内容
 * @param emptyReason 没有代码内容时展示文案
 */
export function useDiffDrawer(emptyReason?: string) {
  const [original, setOriginal] = useState('');
  const [modified, setModified] = useState('');
  const [originalFilePath, setOriginalFilePath] = useState('');
  const [modifiedFilePath, setModifiedFilePath] = useState('');
  const [visible, setVisible] = useState(false);

  const codeDiffDrawerComponent = (
    <Drawer
      maskClosable
      zIndex={999}
      width={'70%'}
      destroyOnClose
      title={`Code Diff`}
      open={visible}
      onClose={() => setVisible(false)}
    >
      {original || modified ? (
        <DiffViewer
          original={original}
          modified={modified}
          originalFilePath={originalFilePath}
          modifiedFilePath={modifiedFilePath}
        />
      ) : (
        <Empty description={emptyReason} />
      )}
    </Drawer>
  );

  return {
    showCodeDiff(diffConfig: {
      original: string;
      modified: string;
      originalFilePath?: string;
      modifiedFilePath?: string;
    }) {
      setOriginal(diffConfig.original);
      setModified(diffConfig.modified);
      setOriginalFilePath(diffConfig.originalFilePath || '');
      setModifiedFilePath(diffConfig.modifiedFilePath || '');
      setVisible(true);
    },
    codeDiffDrawerComponent,
  };
}
