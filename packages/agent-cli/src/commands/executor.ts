export const createExecutor = (
  compact: boolean,
  options?: { write?: (text: string) => void },
) => {
  const spacing = compact ? 0 : 2;
  const write = options?.write ?? ((text: string) => console.log(text));
  return async (handler: () => Promise<unknown>): Promise<void> => {
    try {
      const result = await handler();
      if (result && typeof result === 'object' && 'ok' in result) {
        write(JSON.stringify(result, null, spacing));
        if (!(result as { ok: boolean }).ok) {
          throw new Error('Command returned ok=false');
        }
      } else {
        const spacing = compact ? 0 : 2;
        write(JSON.stringify(result, null, spacing));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      write(JSON.stringify({ ok: false, error: message }, null, spacing));
      throw error;
    }
  };
};
