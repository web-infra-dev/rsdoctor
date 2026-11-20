import { Constants, Manifest } from '@rsdoctor/shared/types';
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
  } catch {
    console.log('[DataLoader] fallback to RemoteDataLoader');
  }

  return new RemoteDataLoader(manifest);
}

export function useDataLoader(
  manifest: Manifest.RsdoctorManifestWithShardingFiles | void,
) {
  const [loader, setLoader] = useState<BaseDataLoader | void>(undefined);
  const briefReport =
    typeof window !== 'undefined' && window[Constants.WINDOW_RSDOCTOR_TAG];

  useEffect(() => {
    if (briefReport) {
      setLoader(BriefDataLoader.forReport(briefReport));
      return;
    }
    if (!manifest) return;

    if (!loaderTask.has(manifest)) {
      const promise = createDataLoader(manifest);
      loaderTask.set(manifest, promise);
    }

    const task = loaderTask.get(manifest)!;
    let active = true;
    task.then((loader) => {
      if (active) setLoader(loader);
    });
    return () => {
      active = false;
    };
  }, [manifest, briefReport]);

  return {
    loader,
  };
}
