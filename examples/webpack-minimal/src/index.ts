import { Instance } from 'chalk';
import { highlight } from './utils';
import { getHtmlText } from './html';
import { key6 } from './utils2';

const print = new Instance();

print(key6);
print(getHtmlText('<div>测试文本</div>'));
print(highlight?.('const abc = 123;'));
