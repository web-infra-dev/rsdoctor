import { Plugin } from '@rsdoctor/types';
import path from 'path';
import { debug, logger } from '@rsdoctor/utils/logger';
import { generateReport } from 'webpack-bundle-analyzer/lib/viewer';

export const TileGraphReportName = 'rsdoctor-tile-graph.html';

type IGenerateReportOpts = {
  reportFilename: string;
  reportTitle?: string;
  bundleDir?: string;
  openBrowser?: boolean;
};
async function generateJSONReportUtil(
  bundleStats: Plugin.BaseStats,
  opts: IGenerateReportOpts,
) {
  await generateReport(bundleStats, {
    ...opts,
    logger: {
      warn: () => {},
      info: () => {},
      error: (e: any) => {
        logger.info(`webpack-bundle-analyzer generateReport has error ${e}`);
      },
    },
  });
}

export async function generateTileGraph(
  bundleStats: Plugin.BaseStats,
  opts: IGenerateReportOpts,
  buildOutputPath: string,
) {
  try {
    const { reportFilename } = opts;
    await generateJSONReportUtil(bundleStats, {
      ...opts,
      openBrowser: false,
      bundleDir: buildOutputPath,
    });

    return path.join(buildOutputPath, `${reportFilename}`);
  } catch (e) {
    debug(() => `Generate webpack-bundle-analyzer tile graph has error:${e}`);
    return null;
  }
}
