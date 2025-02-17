import { expect, test } from 'vitest';
import { createSocket, sendRequest } from '@/mcp/socket';
import { SDK } from '@rsdoctor/types';

test('createSocket', async () => {
  const res = await sendRequest(SDK.ServerAPI.API.GetChunkGraph, {});
  console.log(res);
});
