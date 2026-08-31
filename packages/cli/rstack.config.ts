import { define } from 'rstack';
import { esmPackage } from '@scripts/config/lib';

define.lib(esmPackage);

define.test(async () => {
  const { baseConfig } = await import('@scripts/config/test');

  return baseConfig;
});
