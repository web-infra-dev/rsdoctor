import Theme from 'rspress/theme';
import { NavIcon } from 'rsfamily-doc-ui/nav-icon';
import { HomeLayout as BaseHomeLayout } from 'rspress/theme';
import { ToolStack } from './components/ToolStack';

function HomeLayout() {
  return (
    <BaseHomeLayout
      afterFeatures={
        <>
          <ToolStack />
        </>
      }
    />
  );
}

const Layout = () => <Theme.Layout beforeNavTitle={<NavIcon />} />;

// eslint-disable-next-line import/export
export * from 'rspress/theme';

export default {
  ...Theme,
  Layout,
  HomeLayout,
};
