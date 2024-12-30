import {
  OPENAI_API_KEY,
  OPENAI_BASE_URL,
  OPENAI_INIT_OPTIONS,
  OPENAI_MODEL_NAME,
} from '@/utils/env';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import z from 'zod';

import { LLM } from '.';

export class ChatGPT extends LLM {
  private openai: OpenAI;
  constructor() {
    super();
    this.openai = new OpenAI({
      baseURL: OPENAI_BASE_URL,
      apiKey: OPENAI_API_KEY,
      ...OPENAI_INIT_OPTIONS,
    });
  }
  async chat({
    prompt,
    data,
    schema,
  }: {
    prompt: string;
    data: any;
    schema?: z.ZodObject<any>;
  }) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: OPENAI_MODEL_NAME ?? 'gpt-4o-2024-08-06', // default model
        temperature: 0,
        ...(schema
          ? { response_format: zodResponseFormat(schema, 'event') }
          : {}),
        max_tokens: 16384,
        messages: [
          {
            role: 'system',
            content: prompt,
          },
          {
            role: 'user',
            content: JSON.stringify(data),
          },
          // ...
        ],
      });
      const { content, tool_calls } = completion.choices[0].message;
      return content || tool_calls;
    } catch (e) {
      console.error(e);
      return null;
    }
  }
}
