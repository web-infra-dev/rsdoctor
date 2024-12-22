import React, { useEffect } from 'react';
import { Rule, SDK } from '@rsdoctor/types';
import zhCN from 'antd/locale/zh_CN';
import { hasViewModeFromStorage, useBundleAlertsByErrors, useViewMode } from '../../utils';
import { CommonAlertsContainer } from './common';
import { withServerAPI } from '../Manifest';
import { ViewMode } from '../../constants';
import { PackageRelationReasonsWithServer } from '../Alert/package-relation';
import { ConfigProvider } from 'antd';

interface BundleAlertsProps {
  filter?(alert: Rule.RuleStoreDataItem): boolean;
  project: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetProjectInfo>;
}

export const BundleAlertsBase: React.FC<BundleAlertsProps> = ({ filter, project }) => {
  const { errors, root: cwd } = project;
  const bundleAlerts = useBundleAlertsByErrors(errors);
  const { setBundleAlertsViewMode, viewMode, setViewMode } = useViewMode();

  const dataSource = filter ? bundleAlerts.filter(filter) : bundleAlerts;

  useEffect(() => {
    if (!hasViewModeFromStorage()) {
      setViewMode(
        {
          bundleAlerts: bundleAlerts.length >= 5 ? ViewMode.Group : ViewMode.List,
        },
        false,
      );
    }
  }, []);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        components: {
          Alert: {
            colorInfoBg: '#e6f4ff57',
            colorInfoBorder: 'none',
          }
        }
      }}
    >
      <CommonAlertsContainer
        title="Bundle Alerts"
        dataSource={dataSource}
        extraData={{
          cwd,
          getPackageRelationContentComponent: (res) => (
            <PackageRelationReasonsWithServer body={{ id: res.data.id, target: res.package.target }} cwd={cwd} />
          ),
        }}
        viewMode={viewMode.bundleAlerts}
        setViewMode={setBundleAlertsViewMode}
        cwd={cwd}
      />
    </ConfigProvider>
  );
};

export const BundleAlerts = withServerAPI({
  api: SDK.ServerAPI.API.GetProjectInfo,
  responsePropName: 'project',
  Component: BundleAlertsBase,
});
