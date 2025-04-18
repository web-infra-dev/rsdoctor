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

  const codeDrawerComponent = (
    <Drawer
      maskClosable
      zIndex={999}
      width={'60%'}
      destroyOnClose
      title={`Code of "${filePath}"`}
      open={visible}
      onClose={() => setVisible(false)}
    >
      {code ? (
        <CodeViewer filePath={filePath} code={code} />
      ) : (
        <Empty description={emptyReason} />
      )}
    </Drawer>
  );

  return {
    showCode(code: string, filePath: string) {
      setCode(code);
      setFilePath(filePath);
      setVisible(true);
    },
    codeDrawerComponent,
  };
}
