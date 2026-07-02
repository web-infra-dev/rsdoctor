import {
  PropsWithChildren,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';
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
  useThemeToken,
  useTheme,
} from '../../utils';
import { Progress } from './progress';
import { ConfigContext } from '../../config';
import { SDK } from '@rsdoctor/shared/types';
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
  const { isLight } = useTheme();
  const themeToken = useThemeToken();
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

  useLayoutEffect(() => {
    const $root = document.documentElement;
    const globalCssVars = {
      '--spacing-base': Size.BasePadding + 'px',
      '--layout-nav-height': showHeader ? Size.NavBarHeight + 'px' : '0px',
      '--color-bg-main': MAIN_BG,
      '--color-bg-box': themeToken.colorBgContainer,
      '--color-bg-box-elevated': themeToken.colorBgLayout,
      '--color-border': themeToken.colorBorder,
      '--color-border-secondary': themeToken.colorBorderSecondary,
      '--color-divider': themeToken.colorBorder,
      '--color-scrollbar': isLight
        ? 'rgba(0, 0, 0, 0.5)'
        : 'rgba(255,255,255, 0.5)',
      '--text-color': themeToken.colorText,
      '--text-color-secondary': themeToken.colorTextSecondary,
      '--border-radius': themeToken.borderRadius + 'px',
      '--border-radius-lg': themeToken.borderRadiusLG + 'px',
    };
    for (const [name, value] of Object.entries(globalCssVars)) {
      $root.style.setProperty(name, value);
    }
  }, [showHeader, themeToken, isLight]);

  return (
    <ServerAPIProvider
      api={SDK.ServerAPI.API.GetProjectInfo}
      showSkeleton={false}
    >
      {(project) => (
        <ProjectInfoContext.Provider value={{ project }}>
          <L>
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
