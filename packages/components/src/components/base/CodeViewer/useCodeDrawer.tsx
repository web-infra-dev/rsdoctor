import { SDK } from '@rsdoctor/types';
import { Drawer, Empty } from 'antd';
import { useState } from 'react';
import { CodeViewer } from '.';
import { CodeViewerProps } from './interface';

const defaultEmptyReason = 'No Code';

/**
 * Use drawer to display code content
 * @param emptyReason Text to display when there is no code content
 */
export function useCodeDrawer(emptyReason: string) {
  const [code, setCode] = useState('');
  const [lang, setLang] = useState('');
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
          code={code}
          lang={lang}
          filePath={filePath}
          defaultLine={defaultLine}
          ranges={ranges}
        />
      ) : (
        <Empty description={emptyReason || defaultEmptyReason} />
      )}
    </Drawer>
  );

  return {
    showCode(
      codeConfig: Pick<
        CodeViewerProps,
        'code' | 'filePath' | 'ranges' | 'lang' | 'defaultLine'
      >,
    ) {
      setCode(codeConfig.code || '');
      setLang(codeConfig.lang || '');
      setFilePath(codeConfig.filePath || '');
      setDefaultLine(codeConfig.defaultLine);
      setRanges(codeConfig.ranges);
      setVisible(true);
    },
    codeDrawerComponent,
  };
}
