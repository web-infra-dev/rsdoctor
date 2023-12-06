import { includes } from 'lodash-es';
import { Manifest } from '@rsdoctor/types';

export function hasCompile(routes: Manifest.DoctorManifestClientRoutes[]) {
  const hasCompile =
    includes(routes, Manifest.DoctorManifestClientRoutes.WebpackLoaders) ||
    includes(routes, Manifest.DoctorManifestClientRoutes.ModuleResolve) ||
    includes(routes, Manifest.DoctorManifestClientRoutes.WebpackPlugins);
  return hasCompile;
}

export function hasBundle(routes: Manifest.DoctorManifestClientRoutes[]) {
  const hasBundle =
    includes(routes, Manifest.DoctorManifestClientRoutes.BundleSize) ||
    includes(routes, Manifest.DoctorManifestClientRoutes.ModuleGraph) ||
    includes(routes, Manifest.DoctorManifestClientRoutes.TreeShaking);
  return hasBundle;
}
