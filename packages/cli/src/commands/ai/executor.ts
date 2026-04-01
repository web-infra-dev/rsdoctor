import { printResult } from './utils';

export const createExecutor = (compact: boolean) => {
  const spacing = compact ? 0 : 2;
  return async (handler: () => Promise<unknown>): Promise<void> => {
    try {
      const result = await handler();
      if (result && typeof result === 'object' && 'ok' in result) {
        console.log(JSON.stringify(result, null, spacing));
        if (!(result as { ok: boolean }).ok) {
          process.exit(1);
        }
      } else {
        printResult(result, compact);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(JSON.stringify({ ok: false, error: message }, null, spacing));
      process.exit(1);
    }
  };
};
