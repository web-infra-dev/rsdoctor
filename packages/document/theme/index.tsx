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
        appId: 'TQOGCXPBUD', // cspell:disable-line
        apiKey: '8c30f9d1f12e786a132af15ea30cf997', // cspell:disable-line
        indexName: 'rspack',
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
