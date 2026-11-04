import { PlainObject } from '../../common';
import { connect } from '../../thirdparty';
import { RsdoctorClientRoutes } from '../../client';
import type { SDKOptionsType } from '../instance';
import { API, APIExtends } from './apis';

export * as ServerAPI from './apis';

export const OPEN_IN_EDITOR_EDITORS = ['code', 'cursor', 'trae'] as const;

export type OpenInEditorKind = (typeof OPEN_IN_EDITOR_EDITORS)[number];

interface ClientUrlFunctionWithRouteDefined<T> {
  (
    route: RsdoctorClientRoutes.BundleDiff,
    baselineUrl: string,
    currentUrl: string,
  ): T;
  (route?: 'homepage'): T;
}

interface OpenClientPageFunction {
  (
    route: RsdoctorClientRoutes.BundleDiff,
    baselineUrl: string,
    currentUrl: string,
  ): Promise<void>;
  (route?: 'homepage', autoOpenBrowser?: boolean): Promise<void>;
}

export interface RsdoctorServerInstance {
  readonly app: connect.Server;

  readonly port: number;
  readonly origin: string;
  readonly socketUrl: {
    port: number;
    socketUrl: string;
    token: string;
  };

  innerClientPath?: string;
  innerClientOverrides?: SDKOptionsType['innerClientOverrides'];

  get(
    route: string,
    cb: (
      ...args: Parameters<connect.NextHandleFunction>
    ) => string | PlainObject,
  ): connect.Server;
  post(
    route: string,
    cb: (
      ...args: Parameters<connect.NextHandleFunction>
    ) => string | PlainObject,
  ): connect.Server;

  proxy(
    route: string,
    method: 'GET' | 'POST',
    cb: (
      ...args: Parameters<connect.NextHandleFunction>
    ) => PlainObject | string,
  ): void;

  getClientUrl: ClientUrlFunctionWithRouteDefined<string>;

  openClientPage: OpenClientPageFunction;

  sendAPIDataToClient(api: API | APIExtends, msg: unknown): void | never;

  broadcast(): void;

  bootstrap(): Promise<void>;
  dispose(): Promise<void>;
}
