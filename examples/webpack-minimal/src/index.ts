import { Instance } from 'chalk';
import { highlight } from './utils';
import { getHtmlText } from './html';
import { key6 } from './utils2';
import "./style.css";

const print = new Instance();

print(key6);
print(getHtmlText('<div>Test Text</div>'));
print(highlight?.('const abc = 123;'));
