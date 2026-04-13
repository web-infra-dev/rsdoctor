import { Manifest, SDK } from '@rsdoctor/types';
import { BaseAPI } from './base';
import { Router } from '../router';

const ALL_SERVER_APIS = new Set<string>(Object.values(SDK.ServerAPI.API));
const NON_FORWARDABLE_SOCKET_APIS = new Set<SDK.ServerAPI.API>([
  SDK.ServerAPI.API.EntryHtml,
  SDK.ServerAPI.API.GetModuleCodeByModuleId,
  SDK.ServerAPI.API.GetModuleCodeByModuleIds,
]);

const UNSAFE_CONTENT_PATTERN =
  /<\s*\/?\s*[a-z!][^>]*>|javascript\s*:|on[a-z]+\s*=|data\s*:\s*text\/html/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function assertApiAllowed(
  apiInput: unknown,
): asserts apiInput is SDK.ServerAPI.API {
  if (typeof apiInput !== 'string' || !ALL_SERVER_APIS.has(apiInput)) {
    throw new Error(`Invalid "api" value: ${String(apiInput)}`);
  }
  if (NON_FORWARDABLE_SOCKET_APIS.has(apiInput as SDK.ServerAPI.API)) {
    throw new Error(
      `"api" must not be forwarded by /api/socket/send: ${apiInput}`,
    );
  }
  if (apiInput === SDK.ServerAPI.API.SendAPIDataToClient) {
    throw new Error('"api" must not be /api/socket/send');
  }
}

function assertSafeContent(
  value: unknown,
  path: string,
  visited = new WeakSet<object>(),
) {
  if (value === null || value === undefined) {
    return;
  }

  if (typeof value === 'string') {
    if (UNSAFE_CONTENT_PATTERN.test(value)) {
      throw new Error(`Unsafe content found at ${path}.`);
    }
    return;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return;
  }

  if (typeof value === 'object') {
    if (visited.has(value)) {
      throw new Error(`Unsafe content found at ${path}: circular reference.`);
    }
    visited.add(value);

    if (Array.isArray(value)) {
      value.forEach((item, idx) => {
        assertSafeContent(item, `${path}[${idx}]`, visited);
      });
      return;
    }

    if (isPlainObject(value)) {
      Object.entries(value).forEach(([key, nested]) => {
        assertSafeContent(nested, `${path}.${key}`, visited);
      });
      return;
    }

    throw new Error(`Unsafe content found at ${path}: unsupported value type.`);
  }

  throw new Error(`Unsafe content found at ${path}: unsupported value type.`);
}

type SocketSendPayload = {
  req: {
    api: SDK.ServerAPI.API;
    body: unknown;
  };
  res: unknown;
};

function isSocketResponsePayload(data: unknown): data is SocketSendPayload {
  if (!isPlainObject(data)) {
    return false;
  }
  if (!('req' in data) || !('res' in data)) {
    return false;
  }
  const req = data.req;
  return isPlainObject(req) && typeof req.api === 'string';
}

export function prepareSocketSendPayload(
  apiInput: unknown,
  dataInput: unknown,
): {
  api: SDK.ServerAPI.API;
  payload: SocketSendPayload;
} {
  assertApiAllowed(apiInput);

  const api = apiInput;
  const payload = isSocketResponsePayload(dataInput)
    ? dataInput
    : {
        req: {
          api,
          body: null,
        },
        res: dataInput,
      };

  if (payload.req.api !== api) {
    throw new Error(
      `Invalid payload: data.req.api (${payload.req.api}) must equal api (${api}).`,
    );
  }

  assertSafeContent(payload.req.body, 'data.req.body');
  assertSafeContent(payload.res, 'data.res');

  return {
    api,
    payload,
  };
}

export class DataAPI extends BaseAPI {
  @Router.post(SDK.ServerAPI.API.LoadDataByKey)
  public async loadDataByKey(): Promise<
    SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.LoadDataByKey>
  > {
    const { req } = this.ctx;
    const { url } = req;

    let { key } =
      req.body as SDK.ServerAPI.InferRequestBodyType<SDK.ServerAPI.API.LoadDataByKey>;

    // request by '/api/data/key/${dataKey}'
    // example:
    //   - '/api/data/key/envinfo'
    //   - '/api/data/key/moduleGraph'
    if (!key && url) {
      const uri = new URL(url, 'http://127.0.0.1');

      key = uri.pathname.replace(
        /^\//,
        '',
      ) as Manifest.RsdoctorManifestMappingKeys;
    }

    const data = await this.loadData(key);

    return data;
  }

  @Router.post(SDK.ServerAPI.API.SendAPIDataToClient)
  public async sendMessageToClient(): Promise<
    SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.SendAPIDataToClient>
  > {
    const { req, server } = this.ctx;
    const { api: apiInput, data } =
      req.body as SDK.ServerAPI.InferRequestBodyType<SDK.ServerAPI.API.SendAPIDataToClient>;

    const { api, payload } = prepareSocketSendPayload(apiInput, data);

    await server.sendAPIDataToClient(
      api,
      payload as SDK.ServerAPI.SocketResponseType<SDK.ServerAPI.API>,
    );
  }
}
