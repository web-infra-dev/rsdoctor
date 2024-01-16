import { Constants } from '@rsdoctor/types';

import path from 'path';

export const DistPath = path.resolve(__dirname, '../dist');

export const DistResourcePath = path.resolve(__dirname, '../dist/resource');

export const WebpackRsdoctorDirPath = path.resolve(__dirname, `../dist/${Constants.RsdoctorOutputFolder}`);

export const WebpackStatsFilePath = path.resolve(__dirname, '../dist/stats.json');

export const PortForWeb = 8681;

export const PortForCLI = 8123;

export const ClientEntry = path.resolve(__dirname, '../src/index.tsx');

export const RsdoctorWebpackPluginMain = path.resolve(__dirname, '../../webpack-plugin/dist');
