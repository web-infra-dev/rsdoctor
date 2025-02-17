export abstract class LLM {
  abstract chat(options: { prompt: string; data: any }): Promise<any>;
}
