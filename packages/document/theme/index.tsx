import { Layout as BaseLayout } from 'rspress/theme';
import { NavIcon } from '@rstack-dev/doc-ui/nav-icon';
import { HomeLayout } from './pages';

const Layout = () => <BaseLayout beforeNavTitle={<NavIcon />} />;

export { Layout, HomeLayout };

// eslint-disable-next-line import/export
export * from 'rspress/theme';
