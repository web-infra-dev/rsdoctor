import Theme from 'rspress/theme';
import { HomeLayout } from './pages';

const Layout = () => (
  <Theme.Layout />
);

// eslint-disable-next-line import/export
export * from 'rspress/theme';

export default {
  ...Theme,
  Layout,
  HomeLayout,
};
