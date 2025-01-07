import { Outlet } from '@modern-js/runtime/router';

const { Radio } = await import('antd');

const Layout = (): JSX.Element => (
  <div>
    <Outlet />
    <Radio>Radio</Radio>
  </div>
);

export default Layout;
