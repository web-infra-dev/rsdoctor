import type { Manifest } from '@rsdoctor/shared/types';
import { LocalServerDataLoader } from '../utils/data/local';
import { fetchManifest, parseManifest } from '../utils/request';

export async function loadReportManifest(): Promise<Manifest.RsdoctorManifest> {
  const manifest = await fetchManifest();
  if (!manifest.__LOCAL__SERVER__) return parseManifest(manifest);

  const loader = new LocalServerDataLoader(manifest);
  try {
    const [chunkGraph, moduleGraph, packageGraph, errors, summary] =
      await Promise.all([
        loader.loadData('chunkGraph'),
        loader.loadData('moduleGraph'),
        loader.loadData('packageGraph'),
        loader.loadData('errors'),
        loader.loadData('summary'),
      ]);

    return {
      ...manifest,
      data: {
        hash: manifest.data.hash,
        chunkGraph,
        moduleGraph,
        packageGraph,
        errors,
        summary,
      } as Manifest.RsdoctorManifestData,
    };
  } finally {
    loader.dispose();
  }
}
