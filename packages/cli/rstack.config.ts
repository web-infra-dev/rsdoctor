import { define } from 'rstack';
import { esmPackage } from '../../scripts/lib.config.ts';

define.lib(esmPackage);

define.test(async () => {
  const { baseConfig } = await import('../../scripts/test.config.ts');

  return baseConfig;
});
