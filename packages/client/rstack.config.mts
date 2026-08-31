import { define } from 'rstack';

define.test(async () => {
  const { baseConfig } = await import('../../scripts/test.config.ts');

  return baseConfig;
});
