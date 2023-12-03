import { Manifest } from '@rsdoctor/types';
import { Skeleton } from 'antd';
import React, { useEffect, useState } from 'react';
import { useDataLoader } from '../../utils';
import { PageState } from '../../constants';
import { FailedStatus } from '../Status';
import { BaseDataLoader } from '../../utils/data/base';

type ExtractAlias<T> = T extends [property: string, alias: infer P][] ? `${P extends string ? P : never}` : never;

/**
 * @deprecated
 */
export function ConnectManifestData<
  Props extends object,
  Keys extends
    | [property: `${Manifest.DoctorManifestMappingKeys}`, alias: keyof Props][]
    | [property: string, alias: keyof Props][],
>(
  manifestLoader: () => Promise<Manifest.DoctorManifestWithShardingFiles>,
  keys: Keys,
  Component: React.FC<Props>,
): React.FC<Omit<Props, ExtractAlias<Keys>>> {
  const promise = manifestLoader();

  return function _() {
    const [manifest, setManifest] = useState<Manifest.DoctorManifestWithShardingFiles>();
    const [state, setState] = useState(PageState.Pending);
    const [props, setProps] = useState<Props>({} as Props);

    const { loader } = useDataLoader(manifest);

    useEffect(() => {
      ensureManifest(promise).then(() => {
        executeLoader(loader);
      });
    }, [loader]);

    function ensureManifest(pro: Promise<Manifest.DoctorManifestWithShardingFiles>) {
      return pro
        .then((manifest) => {
          setManifest(manifest);
        })
        .catch(() => {
          setState(PageState.Fail);
        });
    }

    function executeLoader(loader: BaseDataLoader | void) {
      if (!loader) return;
      Promise.all(keys.map(([key]) => loader.loadData(key)))
        .then((e) => {
          const p = e.reduce<Props>((t, val, i) => {
            const [key, alias] = keys[i];
            t[alias] = val as Props[keyof Props];
            return t;
          }, {} as Props);

          // if (process.env.NODE_ENV === 'development') {
          //   console.log('[ConnectManifestData] props: ', p, loader);
          // }

          setProps(p);
          setState(PageState.Success);
        })
        .catch((err) => {
          console.error(err);
          setState(PageState.Fail);
        });
    }

    if (state === PageState.Pending) {
      return <Skeleton active />;
    }

    if (state === PageState.Fail) {
      return (
        <FailedStatus
          retry={() => {
            setState(PageState.Pending);
            promise
              .then(() => {
                executeLoader(loader);
              })
              .catch(() => {
                ensureManifest(manifestLoader());
              });
          }}
        />
      );
    }

    return <Component {...props} />;
  };
}
