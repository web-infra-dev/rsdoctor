import fs from 'fs';
import path from 'path';
import { expect, test } from 'vitest';
import { ChatGPT } from '@/model/openai';
import { codePrompt } from '@/prompt/code';

test('code gen', async () => {
  const instance = new ChatGPT();
  const res = await instance.chat({
    prompt: codePrompt(),
    // schema: assetsAnalysisOutputSchema,
    data: null,
  });
  console.log(res);
  const code = `
    const chunks = require('./chunks.cjs');
    const modules = require('./filtered_modules_2.json');

    ${res}

    const res = fun(chunks, modules);
    console.log(res);
  `;

  fs.writeFileSync(path.join(__dirname, './fixtures/test.cjs'), code);
});
