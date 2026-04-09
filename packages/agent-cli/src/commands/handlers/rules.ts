import { getRuleInfo } from '../tools';

export async function listRules(): Promise<{
  ok: boolean;
  data: unknown;
  description: string;
}> {
  const rules = await getRuleInfo();
  return {
    ok: true,
    data: rules,
    description: 'Get rule scan results (overlay alerts).',
  };
}
