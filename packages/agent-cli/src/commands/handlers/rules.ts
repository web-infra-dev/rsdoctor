import { getRules } from '../datasource';

export async function listRules(): Promise<{
  ok: boolean;
  data: unknown;
  description: string;
}> {
  const rules = getRules();
  return {
    ok: true,
    data: rules,
    description: 'Get rule scan results (overlay alerts).',
  };
}
