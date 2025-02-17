import path from 'node:path';
import fs from 'node:fs';
import { expect, test } from 'vitest';
import z from 'zod';
import { extractPackageName, calcPackageSize } from '@/utils/chunks';
import { ChatGPT } from '@/model/openai';
import { groupByPackageName } from '@/prompt/code';

test('extractPackageName', async () => {
  const m = require(path.resolve(__dirname, './fixtures/modules_client.json'));
  const newModules = m.map((i: any) => ({
    ...i,
    packageName: extractPackageName(i.path),
  }));
  fs.writeFileSync(
    path.join(__dirname, './fixtures/modules_client_2.json'),
    JSON.stringify(newModules, null, 2),
  );
});

test('calcPackageSize', async () => {
  const chunks = require(
    path.resolve(__dirname, './fixtures/chunks_client.json'),
  );
  const m = require(path.resolve(__dirname, './fixtures/modules_client.json'));
  const chunk = chunks.find((i: any) => i.id === '257');
  chunk.modules = chunk.modules.map((i: any) => m.find((j: any) => j.id === i));
  const res = calcPackageSize(chunk.modules);
  console.log(JSON.stringify(res.map((i) => i.package)));
});

test.only('group packages', async () => {
  const instance = new ChatGPT();
  const chunks = require(
    path.resolve(__dirname, './fixtures/chunks_client.json'),
  );
  const m = require(path.resolve(__dirname, './fixtures/modules_client.json'));
  const chunk = chunks.find((i: any) => i.id === '257');
  chunk.modules = chunk.modules.map((i: any) => m.find((j: any) => j.id === i));
  const p = calcPackageSize(chunk.modules);
  const str = JSON.stringify(p.map((i) => i.package));
  const res = await instance.chat({
    prompt: groupByPackageName(),
    data: str,
    schema: z.object({
      result: z.array(
        z.object({
          regex: z.string(),
          packages: z.array(z.string()),
        }),
      ),
    }),
  });
  console.log(res);
});
