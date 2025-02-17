import { expect, test } from 'vitest';
import { ChatGPT } from '@/model/openai';

test('openai chat', async () => {
  const instance = new ChatGPT();
  const data1 = await import('./fixtures/deps.json');
});
