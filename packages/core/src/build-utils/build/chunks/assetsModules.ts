import { Plugin } from '@rsdoctor/types';
import {
  getAssetsModulesData as transform,
  ParsedModuleSizeData,
} from '@/build-utils/common/chunks';
import { parseBundle } from '../utils';

export async function getAssetsModulesData(
  bundleStats: Plugin.StatsCompilation,
  bundleDir: string,
  hasParseBundle = true,
): Promise<ParsedModuleSizeData | null> {
  return transform(
    bundleStats,
    bundleDir,
    hasParseBundle ? { parseBundle } : {},
  );
}
