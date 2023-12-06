import { Client } from '@rsdoctor/types';

export const maxModuleSize = 5000;

export const name = 'BundleSize';

export const route = Client.DoctorClientRoutes.BundleSize;

export type GraphType = 'tile' | 'tree';
