import { Outlet } from '@modern-js/runtime/router';
import React from 'react';

const { Radio } = await import('antd');

const Layout = (): React.JSX.Element => (
  <div>
    <Outlet />
    <Radio>Radio</Radio>
  </div>
);

export default Layout;
