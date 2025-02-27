import React, { useEffect } from 'react';
import { Rule, SDK } from '@rsdoctor/types';
import { hasViewModeFromStorage, useViewMode, useI18n } from '../../utils';
import { BundleAlert } from './bundle-alert';
import { withServerAPI } from '../Manifest';
import { ViewMode } from '../../constants';
import { PackageRelationReasonsWithServer } from '../Alert/package-relation';
import { ConfigProvider } from 'antd';

interface BundleAlertsProps {
  filter?(alert: Rule.RuleStoreDataItem): boolean;
  project: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetProjectInfo>;
}

export const BundleAlertsBase: React.FC<BundleAlertsProps> = ({
  filter,
  project,
}) => {
  const { errors, root: cwd } = project;
  const bundleAlerts = errors;
  const { setBundleAlertsViewMode, viewMode, setViewMode } = useViewMode();
  const { t } = useI18n();

  const dataSource = filter ? bundleAlerts.filter(filter) : bundleAlerts;

  useEffect(() => {
    if (!hasViewModeFromStorage()) {
      setViewMode(
        {
          bundleAlerts:
            bundleAlerts.length >= 5 ? ViewMode.Group : ViewMode.List,
        },
        false,
      );
    }
  }, []);

  return (
    <ConfigProvider
      theme={{
        components: {
          Alert: {
            colorInfoBg: '#e6f4ff57',
            colorInfoBorder: 'none',
          },
        },
        token: {
          padding: 16,
          colorText: 'rgba(0, 0, 0, 0.85)',
        },
      }}
    >
      <BundleAlert
        title={t('Bundle Alerts')}
        dataSource={dataSource}
        extraData={{
          cwd,
          getPackageRelationContentComponent: (res) => (
            <PackageRelationReasonsWithServer
              body={{ id: res.data.id, target: res.package.target }}
              cwd={cwd}
            />
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
