import type { Manifest } from '@rsdoctor/shared/types';
import type { BaseDataLoader } from '../utils/data/base';
import { LocalServerDataLoader } from '../utils/data/local';
import { RemoteDataLoader } from '../utils/data/remote';
import { fetchManifest } from '../utils/request';

export async function loadReportManifest(): Promise<Manifest.RsdoctorManifest> {
  const manifest = await fetchManifest();
  const loader: BaseDataLoader = manifest.__LOCAL__SERVER__
    ? new LocalServerDataLoader(manifest)
    : new RemoteDataLoader(manifest);
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
