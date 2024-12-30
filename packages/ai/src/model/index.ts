export abstract class LLM {
  abstract chat<T, K>(options: { prompt: string; data: T }): Promise<K>;
}
