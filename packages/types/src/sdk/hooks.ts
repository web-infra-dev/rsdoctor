import type { AsyncSeriesHook } from 'tapable';
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
