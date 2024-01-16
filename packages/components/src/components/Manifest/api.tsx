import { Manifest, SDK } from '@rsdoctor/types';
import { Skeleton, Spin } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { includes, isEqual, isNil, values } from 'lodash-es';
import { fetchManifest, useDataLoader } from '../../utils';
import { ComponentState } from '../../constants';
import { FailedStatus } from '../Status';
import { BaseDataLoader } from '../../utils/data/base';

export type InferServerAPIBody<T> = SDK.ServerAPI.InferRequestBodyType<T> extends void
  ? {
      // use `any` to avoid ts check when need not to define the body in this component.
      body?: any;
    }
  : {
      body: SDK.ServerAPI.InferRequestBodyType<T>;
    };

type ServerAPIProviderProps<T extends SDK.ServerAPI.API | SDK.ServerAPI.APIExtends> = {
  manifestLoader?: () => Promise<Manifest.RsdoctorManifestWithShardingFiles>;
  api: T;
  children: (response: SDK.ServerAPI.InferResponseType<T>) => JSX.Element;
  fallbackComponent?: React.FC;
  showSkeleton?: boolean;
} & InferServerAPIBody<T>;

/**
 * this component will request server api to the sdk of Rsdoctor in local development.
 * otherwise it will fallback to load full manifest for the data.
 *
 * @example usage
 * <ServerAPIProvider {...props}>
 *   {(response) => {
 *     <Component {...}></Component>
 *   }}
 * </ServerAPIProvider>
 */
export const ServerAPIProvider = <T extends SDK.ServerAPI.API | SDK.ServerAPI.APIExtends>(
  props: ServerAPIProviderProps<T>,
): JSX.Element | null => {
  const {
    manifestLoader = fetchManifest,
    api,
    children,
    // default value of "body" must be "null" to avoid the response type not match when the socket received message.
    body = null,
    showSkeleton = true,
    fallbackComponent,
  } = props;
  let promise = manifestLoader();
  const [manifest, setManifest] = useState<Manifest.RsdoctorManifestWithShardingFiles>();
  const [state, setState] = useState(ComponentState.Pending);
  const [res, setRes] = useState({} as SDK.ServerAPI.InferResponseType<T>);

  const { loader } = useDataLoader(manifest);

  function init(loader: BaseDataLoader | void) {
    ensureManifest(promise).then(() => {
      executeLoader(loader);
    });
  }

  const update = useCallback(
    ({ req, res: response }: SDK.ServerAPI.SocketResponseType<T>) => {
      if (req.api === api) {
        // body is equal.
        // both two body are null or undefined.
        if (isEqual(req.body, body) || (isNil(req.body) && isNil(body))) {
          if (!isEqual(res, response)) {
            setRes(response);
          }
        }
      }
      // make sure update successful.
      setState(ComponentState.Success);
    },
    [res, api, body],
  );

  useEffect(() => {
    init(loader);
  }, [loader, api, body]);

  useEffect(() => {
    if (!loader) return;
    // add update event listener
    loader.onDataUpdate(api, update);
    return () => {
      // remove update event when the componet unmount.
      loader.removeOnDataUpdate(api, update);
    };
  }, [loader, api, body]);

  function ensureManifest(pro: Promise<Manifest.RsdoctorManifestWithShardingFiles>) {
    return pro
      .then((manifest) => {
        setManifest(manifest);
      })
      .catch((err) => {
        setState(ComponentState.Fail);
        throw err;
      });
  }

  function executeLoader(loader: BaseDataLoader | void) {
    if (!loader) return;

    const exts = values(SDK.ServerAPI.APIExtends);

    // extends api will wait for update only.
    if (includes(exts, api as SDK.ServerAPI.APIExtends)) {
      // extends api need to handle "undefined" response inside component.
      setState(ComponentState.Success);
      return;
    }

    loader
      .loadAPI(api as SDK.ServerAPI.API, body)
      .then((e) => {
        // if (process.env.NODE_ENV === 'development') {
        //   console.log('[ServerAPIProvider] props: ', e, api, loader);
        // }
        // maybe the data not prepared.
        if (isNil(e)) {
          return;
        }
        setRes(e as SDK.ServerAPI.InferResponseType<T>);
        setState(ComponentState.Success);
      })
      .catch((err) => {
        console.error(err);
        setState(ComponentState.Fail);
      });
  }

  if (state === ComponentState.Pending) {
    return showSkeleton ? <Skeleton active /> : null;
  }

  if (state === ComponentState.Fail) {
    if (fallbackComponent) return fallbackComponent as unknown as React.ReactElement;

    return (
      <FailedStatus
        retry={() => {
          setState(ComponentState.Pending);
          promise = manifestLoader();
          init();
        }}
      />
    );
  }

  if (state === ComponentState.Updating) {
    return <Spin spinning>{children(res)}</Spin>;
  }

  return children(res);
};

export function withServerAPI<T, P extends keyof T, A extends SDK.ServerAPI.API | SDK.ServerAPI.APIExtends>({
  Component,
  api,
  responsePropName,
  body: bodyInRoot,
  fallbackComponent,
  showSkeleton,
}: {
  Component: React.FC<T>;
  api: A;
  responsePropName: P;
  fallbackComponent?: React.FC;
  showSkeleton?: boolean;
} & Partial<Partial<InferServerAPIBody<A>>>): React.FC<Omit<T, P> & Partial<InferServerAPIBody<A>>> {
  return function _(props) {
    const { body = bodyInRoot, ...rest } = props;

    return (
      // @ts-ignore
      <ServerAPIProvider api={api} body={body} showSkeleton={showSkeleton} fallbackComponent={fallbackComponent}>
        {(res) => {
          const _props = {
            ...rest,
            [responsePropName]: res,
          } as T & JSX.IntrinsicAttributes;

          return <Component {..._props} />;
        }}
      </ServerAPIProvider>
    );
  };
}
