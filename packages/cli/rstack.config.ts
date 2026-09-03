import { define } from 'rstack';
import { esmPackage } from '@scripts/config/lib';
import { baseConfig } from '@scripts/config/test';

define.lib(esmPackage);

define.test(baseConfig);
