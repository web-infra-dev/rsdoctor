import fs from 'fs';
import path from 'path';
import { expect, test } from 'vitest';
import { ChatGPT } from '@/model/openai';
import type { Chunk, SimpleChunk } from '@/types/index';
import { getOversizedChunks, getSimpleChunk } from '@/utils/index';
import {
  assetsAnalysisOutputSchema,
  chunkSplittingOutputSchema,
} from '@/prompt/schema';
import { chunkSplittingPrompt, assetsAnalysisPrompt } from '@/prompt/assets';

test('filter oversize chunks', async () => {
  // @ts-ignore
  const { default: chunks } = (await import('./fixtures/chunks.cjs')) as {
    default: Chunk[];
  };
  const [oversizedChunks, size] = getOversizedChunks(
    chunks.filter((i) => i.initial),
  );
  expect(oversizedChunks.length).toBe(13);
});

test.only('one chunk oversize analyze', async () => {
  const instance = new ChatGPT();
  // @ts-ignore
  const { default: chunks } = (await import('./fixtures/chunks.cjs')) as {
    default: Chunk[];
  };
  const [oversizedChunks, size] = getOversizedChunks(
    chunks.filter((i) => i.initial),
  );
  const { default: modules } = await import('./fixtures/filtered_modules.json');

  const result = await Promise.all(
    oversizedChunks.map(async (chunk) => {
      const simpleChunk = getSimpleChunk(chunk, modules);
      const res = await instance.chat({
        prompt: chunkSplittingPrompt(size),
        schema: chunkSplittingOutputSchema,
        data: simpleChunk,
      });
      return res;
    }),
  );

  //   for (const chunk of oversizedChunks) {
  //     const simpleChunk = getSimpleChunk(chunk, modules);
  //     const res = await instance.chat({
  //       prompt: chunkSplittingPrompt(size),
  //       schema: chunkSplittingOutputSchema,
  //       data: simpleChunk,
  //     });
  //     res && result.push(res);
  //   }

  // temporary save the result.json for debugging
  fs.writeFileSync(
    path.join(__dirname, './fixtures/result.json'),
    JSON.stringify(result, null, 2),
  );
});

test('formatModulesToPackages', async () => {
  const instance = new ChatGPT();
  // @ts-ignore
  const { default: chunks } = (await import('./fixtures/chunks.cjs')) as {
    default: Chunk[];
  };
  const [oversizedChunks, size] = getOversizedChunks(
    chunks.filter((i) => i.initial),
  );
  const { default: modules } = await import('./fixtures/filtered_modules.json');

  for (const chunk of oversizedChunks) {
    const simpleChunk = getSimpleChunk(chunk, modules);
    console.log(simpleChunk);
    // const res = await instance.chat({
    //   prompt: assetsSizePrompt(size),
    //   data: simpleChunk,
    // });
    // result.push(res);
  }
});

test('chunks analyze', async () => {
  const instance = new ChatGPT();
  // @ts-ignore
  const { default: chunks } = (await import('./fixtures/chunks.cjs')) as {
    default: Chunk[];
  };
  const simpleChunks = chunks
    .filter((i) => i.initial)
    .map((i) => {
      return {
        id: i.id,
        size: i.size,
      };
    });

  const [, size] = getOversizedChunks(chunks.filter((i) => i.initial));

  const res = await instance.chat({
    prompt: assetsAnalysisPrompt({ max: 20 }),
    schema: assetsAnalysisOutputSchema,
    data: { chunks: simpleChunks, median: size },
  });

  console.log(res);
});
