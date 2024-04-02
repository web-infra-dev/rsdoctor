import { render } from 'react-dom';
import { createElement } from 'react';

import { App } from './app';

render(
  createElement(App, { name: 'Taylor' }),
  document.getElementById('root')!,
);
