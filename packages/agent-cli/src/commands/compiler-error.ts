export class CompilerError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly compilers?: string[],
  ) {
    super(message);
  }

  toJSON(): {
    ok: false;
    error: { code: string; message: string; compilers?: string[] };
  } {
    return {
      ok: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.compilers ? { compilers: this.compilers } : {}),
      },
    };
  }
}

export function formatCommandError(error: unknown): string {
  return error instanceof CompilerError
    ? JSON.stringify(error)
    : error instanceof Error
      ? error.message
      : String(error);
}
