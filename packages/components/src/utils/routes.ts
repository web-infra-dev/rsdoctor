import { Manifest } from '@rsdoctor/types';

export function hasCompile(routes: Manifest.RsdoctorManifestClientRoutes[]) {
  const hasCompile =
    routes.includes(Manifest.RsdoctorManifestClientRoutes.WebpackLoaders) ||
    routes.includes(Manifest.RsdoctorManifestClientRoutes.ModuleResolve) ||
    routes.includes(Manifest.RsdoctorManifestClientRoutes.WebpackPlugins);
  return hasCompile;
}

export function hasBundle(routes: Manifest.RsdoctorManifestClientRoutes[]) {
  const hasBundle =
    routes.includes(Manifest.RsdoctorManifestClientRoutes.BundleSize) ||
    routes.includes(Manifest.RsdoctorManifestClientRoutes.ModuleGraph) ||
    routes.includes(Manifest.RsdoctorManifestClientRoutes.TreeShaking);
  return hasBundle;
}
