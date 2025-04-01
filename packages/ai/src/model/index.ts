export abstract class LLM {
  abstract chat(options: { prompt: string; data: any }): Promise<any>;
}

export interface ModelConfig {
  model: string;
  apiKey?: string;
  baseURL: string;
}

export type Model = 'qwen-plus' | 'proxy';

export const modelConfigs: Record<Model, ModelConfig> = {
  'qwen-plus': {
    model: 'qwen-plus',
    apiKey: process.env.OPENAI_API_KEY, // 这里存储环境变量的 key 名称
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  },

  proxy: {
    baseURL: process.env.OPENAI_BASE_URL,
    apiKey: process.env.OPENAI_API_KEY,
    ...JSON.parse(process.env.OPENAI_INIT_OPTIONS ?? '{}'),
  },
};
