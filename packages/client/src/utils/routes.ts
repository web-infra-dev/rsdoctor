import { Manifest } from '@rsdoctor/shared/types';

export function hasCompile(routes: Manifest.RsdoctorManifestClientRoutes[]) {
  const hasCompile =
    routes.includes(Manifest.RsdoctorManifestClientRoutes.Loaders) ||
    routes.includes(Manifest.RsdoctorManifestClientRoutes.ModuleResolve) ||
    routes.includes(Manifest.RsdoctorManifestClientRoutes.Plugins);
  return hasCompile;
}

export function hasBundle(routes: Manifest.RsdoctorManifestClientRoutes[]) {
  const hasBundle =
    routes.includes(Manifest.RsdoctorManifestClientRoutes.BundleSize) ||
    routes.includes(Manifest.RsdoctorManifestClientRoutes.ModuleGraph) ||
    routes.includes(Manifest.RsdoctorManifestClientRoutes.TreeShaking);
  return hasBundle;
}
