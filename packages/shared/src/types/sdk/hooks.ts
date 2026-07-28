import type { AsyncSeriesHook } from '@rspack/lite-tapable';
import { RsdoctorManifestWithShardingFiles } from '../manifest';

/**
 * sdk hooks map
 */
export interface Hooks {
  afterSaveManifest: AsyncSeriesHook<
    [
      {
        manifestWithShardingFiles: RsdoctorManifestWithShardingFiles;
        manifestDiskPath: string;
        manifestCloudPath?: string;
      },
    ]
  >;
}
