import { Layout as BaseLayout } from 'rspress/theme';
import { NavIcon } from '@rstack-dev/doc-ui/nav-icon';
import { HomeLayout } from './pages';
import {
  Search as PluginAlgoliaSearch,
  ZH_LOCALES,
} from '@rspress/plugin-algolia/runtime';
import { useLang } from 'rspress/runtime';

const Layout = () => <BaseLayout beforeNavTitle={<NavIcon />} />;

const Search = () => {
  const lang = useLang();
  return (
    <PluginAlgoliaSearch
      docSearchProps={{
        appId: 'NHFZKCFYI7', // cspell:disable-line
        apiKey: 'db98c3a0aa060d3aa4b30f49fee02b16', // cspell:disable-line
        indexName: 'rstor', // cspell:disable-line
        searchParameters: {
          facetFilters: [`lang:${lang}`],
        },
      }}
      locales={ZH_LOCALES}
    />
  );
};

export { Layout, HomeLayout, Search };
// eslint-disable-next-line import/export
export * from 'rspress/theme';
