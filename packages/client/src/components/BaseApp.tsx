import type { Manifest } from '@rsdoctor/shared/types';
import {
  Button,
  ConfigProvider,
  Divider,
  Result,
  Space,
  Typography,
  theme as te,
} from 'antd';
import type { ThemeConfig } from 'antd';
import React, { useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { HashRouter as BrowserRouter } from 'react-router-dom';
import * as Constants from '../constants';
import { Config, ConfigContext, defaultConfig } from '../config';
import { Layout } from './Layout';
import { getLocale, setThemeToStorage, setViewModeToStorage } from '../utils';

const { PageState, Theme } = Constants;

const darkTheme: ThemeConfig = {
  token: {
    colorPrimary: '#2f81f7',
    colorInfo: '#5b8ff9',
    colorSuccess: '#5ccb8a',
    colorWarning: '#f2b84b',
    colorError: '#ff6b6b',
    colorBgBase: '#090b10',
    colorBgLayout: '#090b10',
    colorBgContainer: '#11151b',
    colorBgElevated: '#171c24',
    colorBorder: 'rgba(255, 255, 255, 0.16)',
    colorBorderSecondary: 'rgba(255, 255, 255, 0.1)',
    colorText: '#f3f5f7',
    colorTextSecondary: '#aab2bf',
    colorTextTertiary: '#7d8796',
    colorFill: 'rgba(255, 255, 255, 0.16)',
    colorFillSecondary: 'rgba(255, 255, 255, 0.1)',
    colorFillTertiary: 'rgba(255, 255, 255, 0.06)',
    colorFillQuaternary: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    borderRadiusLG: 12,
    boxShadowSecondary: '0 12px 32px rgba(0, 0, 0, 0.24)',
  },
  components: {
    Layout: {
      bodyBg: '#090b10',
      headerBg: '#071827',
      headerColor: '#f3f5f7',
    },
    Menu: {
      activeBarHeight: 2,
      darkItemBg: 'transparent',
      darkSubMenuItemBg: '#11151b',
      darkItemColor: '#aab2bf',
      darkItemHoverColor: '#f3f5f7',
      darkItemHoverBg: 'rgba(47, 129, 247, 0.08)',
      darkItemSelectedColor: '#f3f5f7',
      darkItemSelectedBg: 'rgba(47, 129, 247, 0.14)',
      itemBorderRadius: 8,
      horizontalItemBorderRadius: 8,
    },
    Card: {
      headerBg: 'transparent',
      extraColor: '#aab2bf',
    },
    Segmented: {
      trackBg: 'rgba(255, 255, 255, 0.06)',
      itemHoverBg: 'rgba(255, 255, 255, 0.08)',
      itemActiveBg: 'rgba(47, 129, 247, 0.12)',
      itemSelectedBg: '#202733',
      itemSelectedColor: '#f3f5f7',
    },
    Progress: {
      defaultColor: '#2f81f7',
      remainingColor: 'rgba(255, 255, 255, 0.1)',
    },
    Tree: {
      nodeHoverBg: 'rgba(47, 129, 247, 0.08)',
      nodeSelectedBg: 'rgba(47, 129, 247, 0.14)',
      directoryNodeSelectedBg: 'rgba(47, 129, 247, 0.18)',
    },
  },
};

interface BaseAppProps {
  router: React.ReactNode;
  renderFailState?: () => React.ReactNode;
  extraContent?: React.ReactNode;
}

const BaseApp: React.FC<BaseAppProps> = ({
  router,
  renderFailState,
  extraContent,
}): React.ReactElement => {
  const [state, setState] = useState<Constants.PageState>(PageState.Success);
  const [viewMode, setViewMode] = useState<Config['viewMode']>({
    ...defaultConfig.viewMode,
  });
  const [manifest, setManifest] = useState<Manifest.RsdoctorManifest>();
  const [theme, setTheme] = useState(defaultConfig.theme);

  if (state === Constants.PageState.Fail) {
    if (renderFailState) {
      return <>{renderFailState()}</>;
    }
    return (
      <Space direction="vertical" style={{ padding: 14 }}>
        <Typography.Text strong style={{ fontSize: 16 }}>
          load json file of Rsdoctor failed.
        </Typography.Text>
        <Typography.Text>
          try to use <Typography.Text keyboard>command + r</Typography.Text> to
          refresh page.
        </Typography.Text>
        {process.env.NODE_ENV === 'development' ? (
          <Typography.Text>
            in development, you need to run{' '}
            <Typography.Text keyboard>emo run build:analysis</Typography.Text>{' '}
            to make sure the mock data has been generated.
          </Typography.Text>
        ) : null}
        <Divider />
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text style={{ fontSize: 16 }}>
            you can
            <Typography.Text strong style={{ fontSize: 'inherit' }}>
              upload a file
            </Typography.Text>
            in the area below to analyze your project.
          </Typography.Text>
          {/* <UploaderComponent /> */}
        </Space>
        <Divider />
      </Space>
    );
  }

  return (
    <BrowserRouter>
      <ConfigContext.Provider
        value={{
          ...defaultConfig,
          theme,
          setTheme: (v) => {
            setTheme(v);
            setThemeToStorage(v);
          },
          pageState: state,
          json: manifest!,
          viewMode,
          setManifest,
          setPageState: setState,
          setViewMode(m, saveStorage = true) {
            const res = { ...viewMode, ...m };
            setViewMode(res);
            if (saveStorage) {
              setViewModeToStorage(res);
            }
          },
        }}
      >
        <ConfigContext.Consumer>
          {(v) => {
            return (
              <ConfigProvider
                locale={getLocale(v.locale)}
                theme={{
                  components: {
                    ...(theme === Theme.Dark ? darkTheme.components : {}),
                    Layout: {
                      ...(theme === Theme.Dark
                        ? darkTheme.components?.Layout
                        : {}),
                      ...(Theme.Light === theme && {
                        headerBg: '#fff',
                      }),
                    },
                  },
                  algorithm:
                    theme === Theme.Dark
                      ? te.darkAlgorithm
                      : te.defaultAlgorithm,

                  token: {
                    padding: 16,
                    fontFamily: 'var(--font-family-code)',
                    ...(theme === Theme.Dark ? darkTheme.token : {}),
                  },
                }}
              >
                <Layout>
                  <>
                    {extraContent}
                    <ErrorBoundary
                      FallbackComponent={({ error, resetErrorBoundary }) => (
                        <Result
                          status="error"
                          title="Sorry, something went wrong."
                          extra={
                            <Button
                              type="primary"
                              onClick={resetErrorBoundary}
                              loading={state === PageState.Pending}
                            >
                              Reload
                            </Button>
                          }
                        >
                          <Typography.Paragraph>
                            <Typography.Title level={3}>
                              Error Stack
                            </Typography.Title>
                            <pre>{error.stack || error.message}</pre>
                          </Typography.Paragraph>
                        </Result>
                      )}
                      onReset={() => {
                        window.location.reload();
                      }}
                    >
                      {router}
                    </ErrorBoundary>
                  </>
                </Layout>
              </ConfigProvider>
            );
          }}
        </ConfigContext.Consumer>
      </ConfigContext.Provider>
    </BrowserRouter>
  );
};

export default BaseApp;
