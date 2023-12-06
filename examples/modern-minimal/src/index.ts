import { Instance } from 'chalk';
import { highlight } from './utils';
import { getHtmlText } from './html';

const print = new Instance();

print(getHtmlText('<div>Test Text</div>'));
print(highlight('const abc = 123;'));
