import {
  RsdoctorManifestClientRoutes,
  RsdoctorManifestData,
} from '../../../manifest';
import { API, APIExtends } from './index';

export interface ProjectAPIResponse {
  [API.Env]: {
    ip: string;
    port: number;
  };
  [API.GetProjectInfo]: Pick<
    RsdoctorManifestData,
    'hash' | 'root' | 'pid' | 'summary' | 'configs' | 'envinfo' | 'errors'
  > & {
    name?: string;
  };
  [API.GetClientRoutes]: RsdoctorManifestClientRoutes[];
  [APIExtends.GetCompileProgress]: {
    percentage: number;
    message: string;
  };
}

export interface ProjectAPIRequestBody {}
