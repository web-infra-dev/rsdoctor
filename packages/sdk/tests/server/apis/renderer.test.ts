import { File } from '@rsdoctor/utils/build';
import { describe, it, expect } from '@rstest/core';
import { SDK } from '@rsdoctor/types';
import { setupSDK } from '../../utils';

describe('test server/apis/data.ts', () => {
  const target = setupSDK();

  it(`test api: ${SDK.ServerAPI.API.EntryHtml}`, async () => {
    const { text } = await target.get(SDK.ServerAPI.API.EntryHtml);
    expect(text).toBeDefined();
    // const clientHtmlPath = require.resolve('@rsdoctor/client'); // TODO: add doctor client.
    // const clientHtml = await File.fse.readFile(clientHtmlPath, 'utf-8');

    // expect(text).toEqual(clientHtml);
  });
});
