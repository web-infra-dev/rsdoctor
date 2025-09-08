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

export interface LayoutProps {
  children: JSX.Element;
}

export const Layout = (props: PropsWithChildren<LayoutProps>): JSX.Element => {
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
  return (
    <L>
      {!ctx.embedded ? <Header enableRoutes={enableRoutes} /> : null}
      <Progress />
      <L.Content
        style={{
          height: '100%',
          minHeight: '100vh',
          padding: Size.BasePadding,
          marginTop: !ctx.embedded ? Size.NavBarHeight : 0,
          background: MAIN_BG,
        }}
      >
        {children}
        <FloatButton.BackTop />
      </L.Content>
    </L>
  );
};
