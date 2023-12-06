import { Client } from '@rsdoctor/types';

export const name = 'Module Analyze';

export const route = Client.DoctorClientRoutes.ModuleAnalyze;

export enum DevtoolsRuleClientConstant {
  UrlQueryForModuleAnalyze = 'curModuleId',
}

export const clsNamePrefix = 'module-analyze';
