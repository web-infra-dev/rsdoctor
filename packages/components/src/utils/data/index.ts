import { Constants, Manifest } from '@rsdoctor/types';
import { useEffect, useState } from 'react';
import { LocalServerDataLoader } from './local';
import { RemoteDataLoader } from './remote';
import { BaseDataLoader } from './base';
import { getAPILoaderModeFromStorage } from '../storage';
import { APILoaderMode4Dev } from '../../constants';
import { BriefDataLoader } from './brief';

const loaderTask = new WeakMap<
  Manifest.RsdoctorManifestWithShardingFiles,
  Promise<BaseDataLoader>
>();

async function createDataLoader(
  manifest: Manifest.RsdoctorManifestWithShardingFiles,
) {
  try {
    if (process.env.NODE_ENV === 'development') {
      const mode = getAPILoaderModeFromStorage();
      console.log(`[development]-${mode}`);
      if (mode === APILoaderMode4Dev.Local)
        return new LocalServerDataLoader(manifest);
      if (mode === APILoaderMode4Dev.Remote)
        return new RemoteDataLoader(manifest);
    }

    // local server exists
    if (manifest.__LOCAL__SERVER__) {
      console.log(`[LocalServerDataLoader]`);
      return new LocalServerDataLoader(manifest);
    }
  } catch (error) {
    console.log('[DataLoader] fallback to RemoteDataLoader');
  }

  return new RemoteDataLoader(manifest);
}

export function useDataLoader(
  manifest: Manifest.RsdoctorManifestWithShardingFiles | void,
) {
  const [loader, setLoader] = useState<BaseDataLoader | void>(undefined);

  useEffect(() => {
    if (window[Constants.WINDOW_RSDOCTOR_TAG]) {
      console.log('[brief mode]');
      const loader = new BriefDataLoader({ data: [] } as any);
      setLoader(loader);
    }
  }, []);

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
