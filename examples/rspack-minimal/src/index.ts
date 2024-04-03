import { render } from 'react-dom';
import { createElement } from 'react';

import { App } from './app1';

render(
  createElement(App, { name: 'Taylor' }),
  document.getElementById('root')!,
);
