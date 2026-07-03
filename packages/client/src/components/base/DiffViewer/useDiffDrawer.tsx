import { Drawer, Empty } from 'antd';
import { useState } from 'react';
import { DiffViewer } from '.';
import { DiffViewerProps } from './interface';

const defaultEmptyReason = 'No diff code';

/**
 * Use drawer to display code diff content
 * @param emptyReason Text to display when there is no code content
 */
export function useDiffDrawer(emptyReason?: string) {
  const [original, setOriginal] = useState('');
  const [modified, setModified] = useState('');
  const [originalFilePath, setOriginalFilePath] = useState('');
  const [modifiedFilePath, setModifiedFilePath] = useState('');
  const [originalLang, setOriginalLang] = useState('');
  const [modifiedLang, setModifiedLang] = useState('');
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
          originalLang={originalLang}
          modifiedLang={modifiedLang}
          originalFilePath={originalFilePath}
          modifiedFilePath={modifiedFilePath}
        />
      ) : (
        <Empty description={emptyReason || defaultEmptyReason} />
      )}
    </Drawer>
  );

  return {
    showCodeDiff(
      diffConfig: Pick<
        DiffViewerProps,
        | 'original'
        | 'modified'
        | 'originalFilePath'
        | 'modifiedFilePath'
        | 'originalLang'
        | 'modifiedLang'
      >,
    ) {
      setOriginal(diffConfig.original);
      setModified(diffConfig.modified);
      setOriginalLang(diffConfig.originalLang || '');
      setModifiedLang(diffConfig.modifiedLang || '');
      setOriginalFilePath(diffConfig.originalFilePath || '');
      setModifiedFilePath(diffConfig.modifiedFilePath || '');
      setVisible(true);
    },
    codeDiffDrawerComponent,
  };
}
