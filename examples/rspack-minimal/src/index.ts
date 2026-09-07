import { createElement } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app1';

createRoot(document.getElementById('root')!).render(
  createElement(App, { name: 'Taylor' }),
);
