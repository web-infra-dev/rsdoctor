import Theme from 'rspress/theme';
import { NavIcon } from '@rstack-dev/doc-ui/nav-icon';
import { HomeLayout } from './pages';

const Layout = () => <Theme.Layout beforeNavTitle={<NavIcon />} />;

// eslint-disable-next-line import/export
export * from 'rspress/theme';

export default {
  ...Theme,
  Layout,
  HomeLayout,
};
