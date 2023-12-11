import React, { useEffect, useState } from 'react';
import { BadgeColorMap, BadgeType } from '../../Badge';
import { ECMAVersion } from '@rsdoctor/utils/ruleUtils';
import { master } from 'src/utils/worker';

const getECMAVersionDetectWorker = () => new Worker(new URL('./worker.ts', import.meta.url));

export function useECMAVersionDetectWorker(props: { code: string }) {
  const { code } = props;
  const [version, setVersion] = useState<ECMAVersion>();

  useEffect(() => {
    if (!code) return;

    const worker = master.detectWorker(getECMAVersionDetectWorker);

    const { abort } = worker.emit(code, (data: ECMAVersion) => {
      setVersion(data);
    });

    return () => {
      // abort the worker event if the worker hasn't return the response when the component unmount.
      abort();
    };
  }, [code]);

  return {
    version,
  };
}

const TagColor = {
  [ECMAVersion.ES5]: BadgeColorMap[BadgeType.Success],
  [ECMAVersion.ES6]: BadgeColorMap[BadgeType.Error],
  [ECMAVersion.ES7P]: BadgeColorMap[BadgeType.Error],
};

export const ECMAVersionDetectTag: React.FC<{ code: string }> = ({ code }) => {
  if (!code) return null;

  const height = 19.5;
  const { version } = useECMAVersionDetectWorker({ code });

  if (!version) {
    return null;
  }

  return (
    <div
      style={{
        display: 'inline-block',
        height,
        padding: `0px 4px`,
        width: 40,
        fontSize: 10,
        lineHeight: `${height}px`,
        textAlign: 'center',
        color: '#fff',
        background: TagColor[version] || BadgeColorMap[BadgeType.Default],
        borderRadius: 4,
      }}
    >
      {version}
    </div>
  );
};
