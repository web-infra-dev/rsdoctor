import { PropsWithChildren, useContext, useEffect, useState } from 'react';
import { FloatButton, Layout as L } from 'antd';
import { Language, MAIN_BG, Size } from '../../constants';
import { Header } from './header';
import {
  useLocale,
  useI18n,
  getFirstVisitFromStorage,
  setFirstVisitToStorage,
  getLanguage,
  useUrlQuery,
  getEnableRoutesFromUrlQuery,
} from '../../utils';
import { Progress } from './progress';
import { ConfigContext } from '../../config';
import { SDK } from '@rsdoctor/types';
import { ServerAPIProvider } from '../Manifest';
import { ProjectInfoContext } from './project-info-context';
import styles from './index.module.scss';

export interface LayoutProps {
  children: React.JSX.Element;
}

const TitleUpdater: React.FC<{
  name?: string;
}> = ({ name }) => {
  useEffect(() => {
    if (name) {
      document.title = `Rsdoctor - ${name}`;
    } else {
      document.title = 'Rsdoctor';
    }
  }, [name]);

  return null;
};

export const Layout = (
  props: PropsWithChildren<LayoutProps>,
): React.JSX.Element => {
  const locale = useLocale();
  const { i18n } = useI18n();
  const { children } = props;
  const query = useUrlQuery();
  const [enableRoutes, setEnableRoutes] = useState<string[] | undefined>(
    () => getEnableRoutesFromUrlQuery() || undefined,
  );

  useEffect(() => {
    let currentLocale = locale;
    // Check if the user is visiting the site for the first time
    const visited = getFirstVisitFromStorage();
    if (!visited) {
      setFirstVisitToStorage('1');
      const targetLang = window.navigator.language.split('-')[0];
      const userLang = getLanguage(targetLang);

      if (Object.values(Language).includes(userLang)) {
        currentLocale = userLang;
      }
    }

    if (i18n.language !== currentLocale) {
      i18n.changeLanguage(currentLocale);
    }
  }, [locale]);

  // Listen for enableRoutes changes in URL query parameters
  useEffect(() => {
    const newEnableRoutes = getEnableRoutesFromUrlQuery();
    setEnableRoutes(newEnableRoutes || undefined);
  }, [query]);

  const ctx = useContext(ConfigContext);
  const showHeader = !ctx.embedded;

  const globalCssVars = {
    '--spacing-base': Size.BasePadding + 'px',
    '--layout-nav-height': showHeader ? Size.NavBarHeight + 'px' : '0px',
    '--color-bg-main': MAIN_BG,
  } as React.CSSProperties;

  return (
    <ServerAPIProvider
      api={SDK.ServerAPI.API.GetProjectInfo}
      showSkeleton={false}
    >
      {(project) => (
        <ProjectInfoContext.Provider value={{ project }}>
          <L style={globalCssVars}>
            <TitleUpdater name={project?.name} />
            {showHeader && <Header enableRoutes={enableRoutes} />}
            <Progress />
            <L.Content className={styles.content}>
              {children}
              <FloatButton.BackTop />
            </L.Content>
          </L>
        </ProjectInfoContext.Provider>
      )}
    </ServerAPIProvider>
  );
};
