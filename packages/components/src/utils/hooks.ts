import { Algorithm } from '@rsdoctor/utils/common';
import { Client, Manifest, Rule, SDK } from '@rsdoctor/types';
import { uniqBy, isArray, defaults } from 'lodash-es';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import parse from 'url-parse';

import './i18n';
import { Language } from '../constants';
import { setLocaleToStorage } from './storage';

const route = Client.RsdoctorClientRoutes.RuleIndex;

export const useI18n: typeof useTranslation = () => {
  const { i18n, ...rest } = useTranslation();

  return {
    ...rest,
    i18n: {
      ...i18n,
      changeLanguage(lng, callback) {
        return i18n.changeLanguage(lng, (error, t) => {
          if (!error) {
            setLocaleToStorage(lng as Language);
          }
          callback && callback(error, t);
        });
      },
    },
  };
};

export function useRuleIndexNavigate(code: string, link?: string | undefined) {
  const navigate = useNavigate();

  if (link) {
    return () => window.open(link, '__blank');
  }

  return () => {
    navigate(`${route}?${Rule.RsdoctorRuleClientConstant.UrlQueryForErrorCode}=${code}`);
  };
}

export function useUrlQuery() {
  const search = useLocation().search || location.search;
  const { query } = parse(search, true);
  return query;
}

export function useLoading(defaultLoading = false) {
  const [loading, setLoading] = useState<boolean>(defaultLoading);

  return {
    loading,
    setLoading,
    async withLoading(func: (...args: unknown[]) => Promise<unknown> | unknown) {
      try {
        setLoading(true);
        await func();
      } finally {
        setLoading(false);
      }
    },
  };
}

export function useProjectRootByManifest(manifest: Manifest.RsdoctorManifest) {
  return manifest.data.root;
}

export function useHashByManifest(manifest: Manifest.RsdoctorManifest) {
  return manifest.data.hash;
}

export function useCloudManifestUrlByManifest(
  manifest: Manifest.RsdoctorManifest | Manifest.RsdoctorManifestWithShardingFiles | void,
) {
  if (!manifest) return;
}

function ensurePlainObject<T extends object>(value: T, dfts: T): T {
  if (value && typeof value === 'object') {
    if (isArray(value)) {
      return dfts;
    }
    return defaults(value, dfts);
  }

  return dfts;
}

export function useChunkGraphByManifest(manifest: Manifest.RsdoctorManifest) {
  const prev = manifest.data.chunkGraph;
  if (typeof prev === 'string') {
    manifest.data.chunkGraph = JSON.parse(Algorithm.decompressText(prev as string));
  }

  return ensurePlainObject(manifest.data.chunkGraph, { assets: [], chunks: [], entrypoints: [] });
}

export function useConfigOutputFileNameByManifest(manifest: Manifest.RsdoctorManifest) {
  if (typeof manifest.data.configs?.[0]?.config?.output?.filename === 'string') {
    return manifest.data.configs?.[0]?.config?.output?.filename;
  }
  return '';
}

export function useModuleGraphByManifest(manifest: Manifest.RsdoctorManifest) {
  const prev = manifest.data.moduleGraph;
  if (typeof prev === 'string') {
    manifest.data.moduleGraph = JSON.parse(Algorithm.decompressText(prev as string));
  }

  return ensurePlainObject(manifest.data.moduleGraph, {
    dependencies: [],
    modules: [],
    moduleGraphModules: [],
    exports: [],
    sideEffects: [],
    variables: [],
  });
}

export function useModuleGraph(moduleGraph: SDK.ModuleGraphData) {
  const prev = moduleGraph;
  if (typeof prev === 'string') {
    moduleGraph = JSON.parse(Algorithm.decompressText(prev as string));
  }

  return ensurePlainObject(moduleGraph, {
    dependencies: [],
    modules: [],
    moduleGraphModules: [],
    exports: [],
    sideEffects: [],
    variables: [],
  });
}

export function usePackageGraphByManifest(manifest: Manifest.RsdoctorManifest) {
  const prev = manifest.data.packageGraph;
  if (typeof prev === 'string') {
    manifest.data.packageGraph = JSON.parse(Algorithm.decompressText(prev as string));
  }
  return ensurePlainObject(manifest.data.packageGraph, {
    packages: [],
    dependencies: [],
  });
}

export function useUniqModulesByManifest(manifest: Manifest.RsdoctorManifest) {
  return uniqBy(useModuleGraphByManifest(manifest).modules, (e) => e.path);
}

export function useUniqModules(modules: SDK.ModuleData[]) {
  return uniqBy(modules, (e) => e.path);
}

export function useErrorsByManifest(manifest: Manifest.RsdoctorManifest) {
  const prev = manifest.data.errors;
  if (typeof prev === 'string') {
    manifest.data.errors = JSON.parse(Algorithm.decompressText(prev as string));
  }
  return manifest.data.errors || [];
}

export function useBundleAlertsByManifest(manifest: Manifest.RsdoctorManifest) {
  const errors = useErrorsByManifest(manifest);
  return useBundleAlertsByErrors(errors);
}

export function useDuplicatePackagesByManifest(
  manifest: Manifest.RsdoctorManifest,
): Rule.PackageRelationDiffRuleStoreData[] {
  const alerts = useBundleAlertsByManifest(manifest);
  return useDuplicatePackagesByErrors(alerts);
}

export function useCompileAlertsByErrors(errors: Manifest.RsdoctorManifestData['errors']) {
  if (isArray(errors)) {
    return errors.filter(
      (e) => e.category === Rule.RuleMessageCategory.Compile && e.code !== Rule.RuleMessageCodeEnumerated.Overlay,
    );
  }
  return [];
}

export function useBundleAlertsByErrors(errors: Manifest.RsdoctorManifestData['errors']) {
  if (isArray(errors)) {
    return errors.filter(
      (e) => e.category === Rule.RuleMessageCategory.Bundle && e.code !== Rule.RuleMessageCodeEnumerated.Overlay,
    );
  }
  return [];
}

export function useDuplicatePackagesByErrors(errors: Manifest.RsdoctorManifestData['errors']) {
  return useBundleAlertsByErrors(errors).filter(
    (e) => e.code === Rule.RuleErrorMap.E1001.code,
  ) as Rule.PackageRelationDiffRuleStoreData[];
}

export function useWebpackConfigurationByConfigs(configs: SDK.ConfigData = []) {
  if (isArray(configs)) {
    return configs.find((e) => (e.name === 'webpack' ||  e.name === 'rspack'));
  }
  return null;
}

export function useDetectIfCloudIdeEnv() {
  if (window.location.protocol === 'https:' && window.location.href.indexOf('ide-proxy') > 0) {
    return true;
  }
  return false;
}

export function useWindowWidth() {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  return windowWidth;
}

