import { useContext, useEffect, useMemo, useState } from 'react';
import { ModuleGraph } from '@rsdoctor/graph';
import { Manifest, SDK } from '@rsdoctor/types';
import { ConfigContext } from '../config';
import { Theme, ViewMode } from '../constants';
import { fetchManifest } from './request';

export function useManifestJson() {
  const { json } = useContext(ConfigContext);
  return json;
}

export function useLocale() {
  const ctx = useContext(ConfigContext);

  return ctx.locale;
}

export function useTheme() {
  const { theme, setTheme } = useContext(ConfigContext);
  const isDark = theme === Theme.Dark;

  return { theme, setTheme, isDark, isLight: !isDark };
}

export function useViewMode() {
  const { viewMode, setViewMode } = useContext(ConfigContext);

  const { bundleAlerts, compileAlerts } = viewMode;

  return {
    viewMode,
    setViewMode,
    setCompileAlertsViewMode(mode: ViewMode) {
      setViewMode({ compileAlerts: mode });
    },
    setBundleAlertsViewMode(mode: ViewMode) {
      setViewMode({ bundleAlerts: mode });
    },
    isCompileList: compileAlerts === ViewMode.List,
    isBundleList: bundleAlerts === ViewMode.List,
  };
}

export function useManifest(url: string) {
  const [manifest, setManifest] = useState<Manifest.DoctorManifestWithShardingFiles>();

  useEffect(() => {
    fetchManifest(url).then((res) => {
      setManifest(res);
    });
  }, []);

  return manifest;
}

export function useModuleGraphInstanceByModuleGraph(moduleGraph: SDK.ModuleGraphData) {
  return useMemo(() => ModuleGraph.fromData(moduleGraph), [moduleGraph]);
}
