import { expect, test } from '@rstest/core';
import { createSocket, sendRequest } from '../src/server/socket';
import { SDK } from '@rsdoctor/types';

test('createSocket', async () => {
  const res = await sendRequest(SDK.ServerAPI.API.GetChunkGraph, {});
  console.log(res);
});
