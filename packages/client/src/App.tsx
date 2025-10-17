import { Alert } from 'antd';
import React from 'react';
import { getDemoUrl, useDetectIfCloudIdeEnv } from '@rsdoctor/components/utils';
import Router from './router';
import BaseApp from './components/BaseApp';
import { Typography } from 'antd';

const App: React.FC = (): React.ReactElement => {
  const ifCloudIdeEnv = useDetectIfCloudIdeEnv();

  return (
    <BaseApp
      router={<Router />}
      renderFailState={() => {
        const demoUrl = getDemoUrl();
        if (!demoUrl) return null;
        return (
          <Typography.Text style={{ fontSize: 16 }}>
            or you can open the
            <Typography.Text strong style={{ fontSize: 'inherit' }}>
              <a href={demoUrl} target="_blank" rel="noreferrer">
                demo
              </a>
            </Typography.Text>
            to get started with the Rsdoctor.
          </Typography.Text>
        );
      }}
      extraContent={
        ifCloudIdeEnv && (
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
        )
      }
    />
  );
};

export default App;
