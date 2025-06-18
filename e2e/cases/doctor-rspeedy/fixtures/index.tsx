import { root } from '@lynx-js/react';

import { App } from './App.jsx';

root.render(<App />);
// @ts-ignore
if (import.meta.webpackHot) {
  // @ts-ignore
  import.meta.webpackHot.accept();
}
