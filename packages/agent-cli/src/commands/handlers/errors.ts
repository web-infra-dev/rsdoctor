import { getErrors as getErrorsFromData } from '../datasource';
import { requireArg } from '../utils';

interface ErrorItem {
  code: string;
  level: string;
}

export async function listErrors(): Promise<{
  ok: boolean;
  data: unknown;
  description: string;
}> {
  const errors = getErrorsFromData();
  return {
    ok: true,
    data: errors,
    description: 'Get all errors and warnings from the build.',
  };
}

export async function getErrorsByCode(
  codeInput: string | undefined,
): Promise<{ ok: boolean; data: unknown[]; description: string }> {
  const errorCode = requireArg(codeInput, 'code');
  const errors = getErrorsFromData() as ErrorItem[];
  const filtered = errors.filter((error) => error.code === errorCode);
  return {
    ok: true,
    data: filtered,
    description: 'Get errors filtered by error code (e.g., E1001, E1004).',
  };
}

export async function getErrorsByLevel(
  levelInput: string | undefined,
): Promise<{ ok: boolean; data: unknown[]; description: string }> {
  const errorLevel = requireArg(levelInput, 'level');
  const errors = getErrorsFromData() as ErrorItem[];
  const filtered = errors.filter((error) => error.level === errorLevel);
  return {
    ok: true,
    data: filtered,
    description: 'Get errors filtered by level (error, warn, info).',
  };
}
