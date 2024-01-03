import { PropsWithChildren, useEffect } from 'react';
import { FloatButton, Layout as L } from 'antd';
import { MAIN_BG, Size } from '../../constants';
import { Header } from './header';
import { useLocale, useI18n } from '../../utils';
import { Progress } from './progress';

export interface LayoutProps {
  children: JSX.Element;
}

export const Layout = (props: PropsWithChildren<LayoutProps>): JSX.Element => {
  const locale = useLocale();
  const { i18n } = useI18n();
  const { children } = props;


  useEffect(() => {
    if (i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale]);

  return (
    <L>
      <Header />
      <Progress />
      <L.Content
        style={{ height: '100%', minHeight: '100vh', padding: Size.BasePadding, marginTop: Size.NavBarHeight, background: MAIN_BG }}
      >
        {children}
        <FloatButton.BackTop />
      </L.Content>
    </L>
  );
};
