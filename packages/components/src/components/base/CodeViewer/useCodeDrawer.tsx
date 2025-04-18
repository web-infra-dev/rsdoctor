import { SDK } from '@rsdoctor/types';
import { Drawer, Empty } from 'antd';
import { useState } from 'react';
import { CodeViewer } from '.';

/**
 * 使用抽屉展示代码内容
 * @param emptyReason 没有代码内容时展示文案
 */
export function useCodeDrawer(emptyReason: string) {
  const [code, setCode] = useState('');
  const [filePath, setFilePath] = useState('');
  const [visible, setVisible] = useState(false);
  const [defaultLine, setDefaultLine] = useState<number>();
  const [ranges, setRanges] = useState<SDK.SourceRange[]>();

  const codeDrawerComponent = (
    <Drawer
      maskClosable
      zIndex={999}
      width={'70%'}
      destroyOnClose
      title={`Code of "${filePath}"`}
      open={visible}
      onClose={() => setVisible(false)}
    >
      {code ? (
        <CodeViewer
          filePath={filePath}
          code={code}
          defaultLine={defaultLine}
          ranges={ranges}
        />
      ) : (
        <Empty description={emptyReason} />
      )}
    </Drawer>
  );

  return {
    showCode(codeConfig: {
      code: string;
      filePath: string;
      ranges?: SDK.SourceRange[];
      defaultLine?: number;
    }) {
      setCode(codeConfig.code);
      setFilePath(codeConfig.filePath);
      setDefaultLine(codeConfig.defaultLine);
      setRanges(codeConfig.ranges);
      setVisible(true);
    },
    codeDrawerComponent,
  };
}
