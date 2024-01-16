import { Manifest } from '@rsdoctor/types';
import { useEffect, useState } from 'react';
import { LocalServerDataLoader } from './local';
import { RemoteDataLoader } from './remote';
import { BaseDataLoader } from './base';
import { getAPILoaderModeFromStorage } from '../storage';
import { APILoaderMode4Dev } from '../../constants';

const loaderTask = new WeakMap<Manifest.RsdoctorManifestWithShardingFiles, Promise<BaseDataLoader>>();

async function createDataLoader(manifest: Manifest.RsdoctorManifestWithShardingFiles) {
  try {
    if (process.env.NODE_ENV === 'development') {
      const mode = getAPILoaderModeFromStorage();
      if (mode === APILoaderMode4Dev.Local) return new LocalServerDataLoader(manifest);
      if (mode === APILoaderMode4Dev.Remote) return new RemoteDataLoader(manifest);
    }

    // local server exists
    if (manifest.__LOCAL__SERVER__) {
      return new LocalServerDataLoader(manifest);
    }
  } catch (error) {
    console.log('[DataLoader] fallback to RemoteDataLoader');
  }

  return new RemoteDataLoader(manifest);
}

export function useDataLoader(manifest: Manifest.RsdoctorManifestWithShardingFiles | void) {
  const [loader, setLoader] = useState<BaseDataLoader | void>(undefined);

  useEffect(() => {
    if (!manifest) return;

    if (!loaderTask.has(manifest)) {
      const promise = createDataLoader(manifest);
      loaderTask.set(manifest, promise);
    }

    const task = loaderTask.get(manifest)!;
    task.then((loader) => {
      setLoader(loader);
    });
  }, [manifest]);

  return {
    loader,
  };
}
