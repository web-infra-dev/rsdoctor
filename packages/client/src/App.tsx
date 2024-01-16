import { Constants } from '@rsdoctor/components';
import { Config, ConfigContext, defaultConfig } from '@rsdoctor/components/config';
import { Layout } from '@rsdoctor/components/elements';
import { getDemoUrl, getLocale, setThemeToStorage, setViewModeToStorage, useDetectIfCloudIdeEnv } from '@rsdoctor/components/utils';
import type { Manifest } from '@rsdoctor/types';
import { Alert, Button, ConfigProvider, Divider, Result, Space, Typography, theme as te } from 'antd';
import React, { useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { HashRouter as BrowserRouter } from 'react-router-dom';
import Router from './router';

const { PageState, Theme } = Constants;

const App: React.FC = (): React.ReactElement => {
  const ifCloudIdeEnv = useDetectIfCloudIdeEnv();

  const [state, setState] = useState<Constants.PageState>(PageState.Success);
  const [viewMode, setViewMode] = useState<Config['viewMode']>({ ...defaultConfig.viewMode });
  const [manifest, setManifest] = useState<Manifest.RsdoctorManifest>();
  const [theme, setTheme] = useState(defaultConfig.theme);

  if (state === Constants.PageState.Fail) {
    const demoUrl = getDemoUrl();
    return (
      <Space direction="vertical" style={{ padding: 14 }}>
        <Typography.Text strong style={{ fontSize: 16 }}>
          load json file of Rsdoctor failed.
        </Typography.Text>
        <Typography.Text>
          try to use <Typography.Text keyboard>command + r</Typography.Text> to refresh page.
        </Typography.Text>
        {process.env.NODE_ENV === 'development' ? (
          <Typography.Text>
            in development, you need to run <Typography.Text keyboard>emo run build:analysis</Typography.Text> to make
            sure the mock data has been generated.
          </Typography.Text>
        ) : null}
        <Divider />
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text style={{ fontSize: 16 }}>
            you can
            <Typography.Text strong style={{ fontSize: 'inherit' }}>
              {' '}
              upload a file{' '}
            </Typography.Text>
            in the area below to analyze your project.
          </Typography.Text>
          {/* <UploaderComponent /> */}
        </Space>
        <Divider />
        {demoUrl ? (
          <Typography.Text style={{ fontSize: 16 }}>
            or you can open the{' '}
            <Typography.Text strong style={{ fontSize: 'inherit' }}>
              <a href={demoUrl} target="_blank" rel="noreferrer">
                demo
              </a>
            </Typography.Text>{' '}
            to get started with the Rsdoctor.
          </Typography.Text>
        ) : null}
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
            saveStorage && setViewModeToStorage(res);
          },
        }}
      >
        <ConfigContext.Consumer>
          {(v) => {
            return (
              <ConfigProvider
                locale={getLocale(v.locale)}
                theme={{
                  algorithm: theme === Theme.Dark ? te.darkAlgorithm : te.defaultAlgorithm,
                }}
              >
                <Layout>
                  <>
                    {ifCloudIdeEnv && (
                      <Alert
                        message="Warning"
                        description={
                          <a
                            href={window.location.href.replace(/https/, 'http')}
                          >{`Please jump to：${window.location.href.replace(/https/, 'http')}`}</a>
                        }
                        type="warning"
                        showIcon
                        closable
                      />
                    )}
                    <ErrorBoundary
                      FallbackComponent={({ error, resetErrorBoundary }) => (
                        <Result
                          status="error"
                          title="Sorry, something went wrong."
                          extra={
                            <Button type="primary" onClick={resetErrorBoundary} loading={state === PageState.Pending}>
                              Reload
                            </Button>
                          }
                        >
                          <Typography.Paragraph>
                            <Typography.Title level={3}>Error Stack</Typography.Title>
                            <pre>{error.stack || error.message}</pre>
                          </Typography.Paragraph>
                        </Result>
                      )}
                      onReset={() => {
                        window.location.reload();
                      }}
                    >
                      <Router />
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

export default App;