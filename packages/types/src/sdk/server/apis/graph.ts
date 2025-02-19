import { API } from './index';
import { ModuleData, ModuleGraphData } from '../../module';
import { RsdoctorClientAssetsSummary } from '../../../client';
import {
  AssetData,
  ChunkData,
  ChunkGraphData,
  EntryPointData,
} from '../../chunk';

export interface GraphAPIResponse {
  [API.GetAssetsSummary]: RsdoctorClientAssetsSummary;
  [API.GetAssetDetails]: {
    asset: AssetData;
  } & Pick<ModuleGraphData, 'modules'> &
    Pick<ChunkGraphData, 'chunks'>;
  [API.GetChunksByModuleId]: ChunkData[];
  [API.GetModuleDetails]: {
    module: ModuleData;
  } & Pick<ModuleGraphData, 'dependencies'>;
  [API.GetModulesByModuleIds]: ModuleData[];
  [API.GetEntryPoints]: EntryPointData[];
}

export interface GraphAPIRequestBody {
  [API.GetAssetsSummary]: {
    withFileContent?: boolean;
  };
  [API.GetAssetDetails]: {
    assetPath: string;
  };
  [API.GetChunksByModuleId]: {
    moduleId: number;
  };
  [API.GetModuleDetails]: {
    moduleId: number;
  };
  [API.GetModulesByModuleIds]: {
    moduleIds: number[];
  };
  [API.GetModuleCodeByModuleId]: {
    moduleId: number;
  };
  [API.GetModuleCodeByModuleIds]: {
    moduleIds: number[];
  };
  [API.GetAllModuleGraph]: {};
  [API.GetAllChunkGraph]: {};
  [API.GetSearchModules]: {
    moduleName: string;
  };
  [API.GetSearchModuleInChunk]: {
    moduleName: string;
    chunk: string;
  };
}
