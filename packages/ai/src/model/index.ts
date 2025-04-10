export abstract class LLM {
  abstract chat(options: { prompt: string; data: any }): Promise<any>;
}

export interface ModelConfig {
  model: string;
  apiKey?: string;
  baseURL: string;
  maxTokens: number;
}

export type Model = 'qwen' | 'default';

export const modelConfigs: Record<Model, ModelConfig> = {
  qwen: {
    model: 'qwen-plus',
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    maxTokens: 8192,
  },

  default: {
    baseURL: process.env.OPENAI_BASE_URL,
    apiKey: process.env.OPENAI_API_KEY,
    maxTokens: 16384,
    ...JSON.parse(process.env.OPENAI_INIT_OPTIONS ?? '{}'),
  },
};
