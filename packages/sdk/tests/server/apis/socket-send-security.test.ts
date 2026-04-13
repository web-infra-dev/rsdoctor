import { describe, expect, it } from '@rstest/core';
import { SDK } from '@rsdoctor/types';

import { prepareSocketSendPayload } from '../../../src/sdk/server/apis/data';

describe('socket send payload security', () => {
  it('rejects unknown api', () => {
    expect(() =>
      prepareSocketSendPayload('/api/not-exists', {
        hello: 'world',
      }),
    ).toThrow('Invalid "api"');
  });

  it('rejects forwarding to /api/socket/send itself', () => {
    expect(() =>
      prepareSocketSendPayload(SDK.ServerAPI.API.SendAPIDataToClient, {
        hello: 'world',
      }),
    ).toThrow('must not be /api/socket/send');
  });

  it('rejects forwarding html entry api', () => {
    expect(() =>
      prepareSocketSendPayload(SDK.ServerAPI.API.EntryHtml, {
        html: '<!doctype html><html></html>',
      }),
    ).toThrow('must not be forwarded by /api/socket/send');
  });

  it('rejects forwarding source-code apis', () => {
    expect(() =>
      prepareSocketSendPayload(SDK.ServerAPI.API.GetModuleCodeByModuleId, {
        code: 'const a = `<div></div>`;',
      }),
    ).toThrow('must not be forwarded by /api/socket/send');
  });

  it('rejects dangerous html content in payload', () => {
    expect(() =>
      prepareSocketSendPayload(SDK.ServerAPI.API.GetProjectInfo, {
        errors: [
          {
            description: '<img src=x onerror=alert(1)>',
          },
        ],
      }),
    ).toThrow('Unsafe content');
  });

  it('rejects self-referential arrays', () => {
    const payload: unknown[] = [];
    payload.push(payload);

    expect(() =>
      prepareSocketSendPayload(SDK.ServerAPI.API.GetProjectInfo, {
        payload,
      }),
    ).toThrow('circular reference');
  });

  it('rejects array-object cycles', () => {
    const payload: {
      items: unknown[];
    } = {
      items: [],
    };
    payload.items.push(payload);

    expect(() =>
      prepareSocketSendPayload(SDK.ServerAPI.API.GetProjectInfo, {
        payload,
      }),
    ).toThrow('circular reference');
  });

  it('normalizes raw data to socket response payload', () => {
    const api = SDK.ServerAPI.API.GetProjectInfo;
    const data = {
      status: 'ok',
      message: 'safe text',
    };

    const result = prepareSocketSendPayload(api, data);

    expect(result).toStrictEqual({
      api,
      payload: {
        req: {
          api,
          body: null,
        },
        res: data,
      },
    });
  });

  it('keeps structured socket response payload when req.api matches', () => {
    const api = SDK.ServerAPI.API.GetProjectInfo;
    const payload = {
      req: {
        api,
        body: null,
      },
      res: {
        progress: 1,
      },
    };

    const result = prepareSocketSendPayload(api, payload);

    expect(result).toStrictEqual({
      api,
      payload,
    });
  });
});
