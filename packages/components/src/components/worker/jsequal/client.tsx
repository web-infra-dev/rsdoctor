import React, { useEffect, useState } from 'react';
import { Tag } from 'antd';
import { master } from '../../../utils/worker';
import { useI18n } from '../../../utils';

const getJSEqualWorker = () => new Worker(new URL('./worker.ts', import.meta.url));

export function useJSEqualWorker(props: { input: string; output: string }) {
  const { input, output } = props;
  const [isEqual, setIsEqual] = useState<boolean>(false);

  useEffect(() => {
    if (!input || !output) return;

    const worker = master.detectWorker(getJSEqualWorker);

    const { abort } = worker.emit({ input, output }, (data: boolean) => {
      setIsEqual(data);
    });

    return () => {
      // abort the worker event if the worker hasn't return the response when the component unmount.
      abort();
    };
  }, [input, output]);

  return {
    isEqual,
  };
}

export const JSIsEqualTag: React.FC<{ input: string; output: string }> = ({ input, output }) => {
  if (!input || !output) return null;

  const { isEqual } = useJSEqualWorker({ input, output });
  const { t } = useI18n();

  if (!isEqual) {
    return null;
  }

  return <Tag color="warning">{t('the file content not changed after transpiled by this loader')}</Tag>;
};
