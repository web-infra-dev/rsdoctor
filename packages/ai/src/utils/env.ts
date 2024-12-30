export const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? undefined;
export const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? undefined;
export const OPENAI_MODEL_NAME = process.env.OPENAI_MODEL_NAME ?? undefined;
export const OPENAI_INIT_OPTIONS = JSON.parse(
  process.env.OPENAI_INIT_OPTIONS ?? '{}',
);
