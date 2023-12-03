import React, { useEffect } from 'react';
import { Rule, SDK } from '@rsdoctor/types';
import { hasViewModeFromStorage, useCompileAlertsByErrors, useViewMode } from '../../utils';
import { CommonAlertsContainer } from './common';
import { withServerAPI } from '../Manifest';
import { ViewMode } from '../../constants';
import { PackageRelationReasonsWithServer } from '../Alert/package-relation';

interface CompileAlertsProps {
  filter?(alert: Rule.RuleStoreDataItem): boolean;
  project: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetProjectInfo>;
}

const CompileAlertsBase: React.FC<CompileAlertsProps> = ({ filter, project }) => {
  const { root: cwd, errors } = project;
  const compileAlerts = useCompileAlertsByErrors(errors);
  const { setCompileAlertsViewMode, viewMode, setViewMode } = useViewMode();

  const dataSource = filter ? compileAlerts.filter(filter) : compileAlerts;

  useEffect(() => {
    if (!hasViewModeFromStorage()) {
      setViewMode(
        {
          compileAlerts: compileAlerts.length >= 5 ? ViewMode.Group : ViewMode.List,
        },
        false,
      );
    }
  }, []);

  return (
    <CommonAlertsContainer
      title="Compile Alerts"
      dataSource={dataSource}
      extraData={{
        cwd,
        getPackageRelationContentComponent: (res) => (
          <PackageRelationReasonsWithServer body={{ id: res.data.id, target: res.package.target }} cwd={cwd} />
        ),
      }}
      viewMode={viewMode.compileAlerts}
      setViewMode={setCompileAlertsViewMode}
      cwd={cwd}
    />
  );
};

export const CompileAlerts = withServerAPI({
  api: SDK.ServerAPI.API.GetProjectInfo,
  responsePropName: 'project',
  Component: CompileAlertsBase,
});
