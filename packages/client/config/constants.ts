import { Constants } from '@rsdoctor/shared/types';

import path from 'node:path';

export const DistPath = path.resolve(import.meta.dirname, '../dist');

export const DistResourcePath = path.resolve(
  import.meta.dirname,
  '../dist/resource',
);

export const WebpackRsdoctorDirPath = path.resolve(
  import.meta.dirname,
  `../dist/${Constants.RsdoctorOutputFolder}`,
);

export const WebpackStatsFilePath = path.resolve(
  import.meta.dirname,
  '../dist/stats.json',
);

export const PortForWeb = 8681;

export const PortForCLI = 8123;

export const ClientEntry = path.resolve(
  import.meta.dirname,
  '../src/index.tsx',
);
