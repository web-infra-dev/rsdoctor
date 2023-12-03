import React, { useEffect } from 'react';
import { Rule, SDK } from '@rsdoctor/types';
import { hasViewModeFromStorage, useBundleAlertsByErrors, useViewMode } from '../../utils';
import { CommonAlertsContainer } from './common';
import { withServerAPI } from '../Manifest';
import { ViewMode } from '../../constants';
import { PackageRelationReasonsWithServer } from '../Alert/package-relation';

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
  );
};

export const BundleAlerts = withServerAPI({
  api: SDK.ServerAPI.API.GetProjectInfo,
  responsePropName: 'project',
  Component: BundleAlertsBase,
});
