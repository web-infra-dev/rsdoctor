import { includes } from 'lodash-es';
import { Manifest } from '@rsdoctor/types';

export function hasCompile(routes: Manifest.RsdoctorManifestClientRoutes[]) {
  const hasCompile =
    includes(routes, Manifest.RsdoctorManifestClientRoutes.WebpackLoaders) ||
    includes(routes, Manifest.RsdoctorManifestClientRoutes.ModuleResolve) ||
    includes(routes, Manifest.RsdoctorManifestClientRoutes.WebpackPlugins);
  return hasCompile;
}

export function hasBundle(routes: Manifest.RsdoctorManifestClientRoutes[]) {
  const hasBundle =
    includes(routes, Manifest.RsdoctorManifestClientRoutes.BundleSize) ||
    includes(routes, Manifest.RsdoctorManifestClientRoutes.ModuleGraph) ||
    includes(routes, Manifest.RsdoctorManifestClientRoutes.TreeShaking);
  return hasBundle;
}
