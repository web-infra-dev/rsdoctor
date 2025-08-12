import { API } from './index';
import { ResourceData, LoaderTransformData } from '../../loader';
import { Get } from '../../../common';

export interface LoaderAPIResponse {
  [API.GetLoaderNames]: string[];

  [API.GetLayers]: string[];

  [API.GetLoaderChartData]: Array<
    Pick<
      LoaderTransformData,
      'loader' | 'isPitch' | 'startAt' | 'endAt' | 'pid' | 'sync'
    > & {
      resource: Get<ResourceData, 'path'>;
      layer: Get<ResourceData, 'layer'>;
      costs: number;
    }
  >;

  [API.GetLoaderFileTree]: Array<
    Pick<ResourceData, 'path' | 'layer'> & {
      loaders: Array<
        Pick<LoaderTransformData, 'loader' | 'path' | 'errors'> & {
          costs: number;
        }
      >;
    }
  >;
  [API.GetLoaderFileDetails]: {
    resource: ResourceData;
    loaders: (LoaderTransformData & {
      costs: number;
    })[];
  };
  [API.GetLoaderFolderStatistics]: Array<
    Pick<LoaderTransformData, 'loader' | 'path'> & {
      files: number;
      costs: number;
    }
  >;
  [API.GetLoaderFileFirstInput]: string;
  [API.GetLoaderFileInputAndOutput]: { input: string; output: string };
  [API.GetTreemapReportHtml]: string;
  [API.GetDirectoriesLoaders]: Array<{
    directory: string;
    stats: Array<
      Pick<LoaderTransformData, 'loader' | 'path'> & {
        files: number;
        costs: number;
      }
    >;
  }>;
}

export interface LoaderAPIRequestBody {
  [API.GetLoaderFileDetails]: Pick<ResourceData, 'path'>;
  [API.GetLoaderFolderStatistics]: { folder: string };
  [API.GetLoaderFileFirstInput]: { file: string };
  [API.GetLoaderFileInputAndOutput]: {
    file: string;
    loader: string;
    loaderIndex: number;
  };

  [API.GetTreemapReportHtml]: {};
}
