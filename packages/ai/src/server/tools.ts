import { SDK } from '@rsdoctor/types';
import { sendRequest } from './socket.js';
import { toolDescriptions } from '@/prompt/bundle.js';

export enum Tools {
  GetAllChunks = 'get_chunks',
  GetChunkById = 'get_chunk_by_id',
  GetAllModules = 'get_modules',
  GetModuleById = 'get_module_by_id',
  GetModuleByPath = 'get_module_by_path',
  GetModuleIssuerPath = 'get_module_issuer_path',
  GetPackageInfo = 'get_package_info',
  GetPackageDependency = 'get_package_dependency',
  GetRuleInfo = 'get_rule_info',
  GetSimilarPackages = 'get_similar_packages',
  GetBundleOptimize = 'get_bundle_optimize',
  GetLargeChunks = 'get_large_chunks',
  GetDuplicatePackages = 'get_duplicate_packages',
  GetMediaAssetPrompt = 'get_media_asset_prompt',
  getLoaderTimeForAllFiles = 'get_loader_time_all_files',
  getLoaderTimes = 'get_loader_times',
}

// Define the type for the response of getAllChunks
export type GetAllChunksResponse = {
  isError: boolean;
  content: any; // Replace 'any' with the actual type of data if known
};

export const getAllChunks = async (): Promise<
  SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetChunkGraphAI>
> => {
  return (await sendRequest(
    SDK.ServerAPI.API.GetChunkGraphAI,
    {},
  )) as SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetChunkGraphAI>;
};

export const getChunkById = async (chunkId: number) => {
  const chunk = await sendRequest(SDK.ServerAPI.API.GetChunkByIdAI, {
    chunkId,
  });
  if (chunk) {
    return {
      content: [
        {
          tools: Tools.GetChunkById,
          type: 'text',
          text: JSON.stringify(chunk),
        },
      ],
      isError: false,
    };
  }

  return {
    content: [
      { tools: Tools.GetChunkById, type: 'text', text: 'No chunk find.' },
    ],
    isError: true,
  };
};

export const getModuleDetailById = async (moduleId: number) => {
  return await sendRequest(SDK.ServerAPI.API.GetModuleDetails, {
    moduleId,
  });
};

export const getModuleByPath = async (moduleName: string) => {
  const modulesRes = (await sendRequest(SDK.ServerAPI.API.GetModuleByName, {
    moduleName,
  })) as { id: string; path: string }[];

  if (modulesRes?.length === 1) {
    const moduleInfo = await getModuleById(modulesRes[0].id);
    return {
      content: [
        {
          tools: Tools.GetModuleByPath,
          type: 'text',
          text: JSON.stringify(moduleInfo),
        },
      ],
      isError: false,
    };
  }

  if (modulesRes?.length > 1) {
    return {
      content: [
        {
          tools: Tools.GetModuleByPath,
          type: 'text',
          text: 'Multiple modules found. Please specify which one you need.',
        },
        {
          tools: Tools.GetModuleByPath,
          type: 'text',
          text: JSON.stringify(modulesRes),
        },
      ],
      isError: false,
    };
  }

  return {
    content: [
      { tools: Tools.GetModuleByPath, type: 'text', text: 'No module found.' },
    ],
    isError: true,
  };
};

export const getModuleIssuerPath = async (moduleId: string) => {
  const res =
    ((await sendRequest(SDK.ServerAPI.API.GetModuleIssuerPath, {
      moduleId,
    })) as SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetModuleIssuerPath>) ||
    [];

  return {
    content: [
      {
        tools: Tools.GetModuleIssuerPath,
        type: 'text',
        text: JSON.stringify(res),
      },
    ],
    isError: false,
  };
};

// TODO: Maybe need add the allDependencies infos?
export const getModuleById = async (
  moduleId: string,
): Promise<{
  module: {
    id: string;
    renderId: string;
    webpackId: string | number;
    path: string;
    isPreferSource: boolean;
    imported: number[];
    dependencies?: SDK.ModuleData[];
    allDependencies?: SDK.DependencyData[];
  };
}> => {
  const res = (await sendRequest(SDK.ServerAPI.API.GetModuleDetails, {
    moduleId,
  })) as SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetModuleDetails>;

  const dependencies = await Promise.all(
    res.module.issuerPath?.map(async (moduleId) => {
      const moduleInfo = (await sendRequest(
        SDK.ServerAPI.API.GetModuleDetails,
        {
          moduleId,
        },
      )) as SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetModuleDetails>;
      return moduleInfo.module;
    }) || [],
  );

  return {
    module: {
      dependencies,
      id: res.module.id,
      renderId: res.module.renderId,
      webpackId: res.module.webpackId,
      path: res.module.path,
      isPreferSource: res.module.isPreferSource,
      imported: res.module.imported,
    },
  };
};

export const getPackageInfo = async (): Promise<
  SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetPackageInfo>
> => {
  return (await sendRequest(
    SDK.ServerAPI.API.GetPackageInfo,
    {},
  )) as SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetPackageInfo>;
};

export const getPackageDependency = async () => {
  return await sendRequest(SDK.ServerAPI.API.GetPackageDependency, {});
};

export const getRuleInfo = async () => {
  return await sendRequest(SDK.ServerAPI.API.GetOverlayAlerts, {});
};

export const getDuplicatePackages = async () => {
  const ruleInfo =
    (await getRuleInfo()) as SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetOverlayAlerts>;

  if (!ruleInfo) {
    return {
      content: [
        { tools: Tools.GetRuleInfo, type: 'text', text: 'No rule info found.' },
      ],
      isError: true,
    };
  }

  // Assuming ruleInfo contains a 'rules' array
  // @ts-ignore
  const e1001Rule = ruleInfo?.find((rule) =>
    rule.description?.includes('E1001'),
  );

  if (e1001Rule) {
    return {
      content: [
        {
          tools: Tools.GetRuleInfo,
          type: 'text',
          text: JSON.stringify(e1001Rule),
        },
      ],
      isError: false,
    };
  }

  return {
    content: [
      {
        tools: Tools.GetRuleInfo,
        type: 'text',
        text: 'No duplicate packages found for E1001.',
      },
    ],
    isError: true,
  };
};

export const getMediaAssetPrompt = async () => {
  const res = await getAllChunks();
  return {
    content: [
      {
        tools: Tools.GetMediaAssetPrompt,
        type: 'text',
        description: toolDescriptions.getMediaAssetPrompt,
        text: JSON.stringify(res),
      },
    ],
    isError: false,
  };
};

export const getSimilarPackages = async () => {
  const res = await getPackageInfo();
  const similarPackagesRules = [
    ['lodash', 'lodash-es', 'string_decode'],
    ['dayjs', 'moment', 'date-fns', 'js-joda'],
    ['antd', 'material-ui', 'semantic-ui-react', 'arco-design'],
    ['axios', 'node-fetch'],
    ['redux', 'mobx', 'Zustand', 'Recoil', 'Jotai'],
    ['chalk', 'colors', 'picocolors', 'kleur'],
    ['fs-extra', 'graceful-fs'],
  ];

  const foundSimilarPackages = similarPackagesRules
    .map((rule) => {
      const found = rule.filter((pkg) => res.some((p) => p.name === pkg));
      return found.length > 1 ? found : null;
    })
    .filter(Boolean);

  return {
    content: [
      {
        tools: Tools.GetSimilarPackages,
        type: 'text',
        description: toolDescriptions.getSimilarPackages,
        text: JSON.stringify(foundSimilarPackages),
      },
    ],
    isError: foundSimilarPackages.length === 0,
  };
};

export const getLargeChunks = async () => {
  const allChunks = await getAllChunks();

  if (!allChunks.length) {
    return [];
  }

  // Extract sizes from allChunks
  const sizes = allChunks.map((chunk) => chunk.size);

  // Sort sizes to find the median
  sizes.sort((a, b) => a - b);
  const mid = Math.floor(sizes.length / 2);
  const median =
    sizes.length % 2 !== 0 ? sizes[mid] : (sizes[mid - 1] + sizes[mid]) / 2;

  // Find chunks larger than 30% of the median
  const largeChunks = allChunks.filter((chunk) => chunk.size > median * 1.3);

  return {
    content: [
      {
        tools: Tools.GetLargeChunks,
        type: 'text',
        description:
          'For filtered large resources, provide splitChunks optimization suggestions based on webpack best practices',
        text: JSON.stringify(largeChunks),
      },
    ],
    isError: false,
  };
};

export const getLoaderTimeForAllFiles = async (): Promise<
  SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetLoaderChartData>
> => {
  return (await sendRequest(
    SDK.ServerAPI.API.GetLoaderChartData,
    {},
  )) as SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetLoaderChartData>;
};

export const getLoaderTimes = async () => {
  return await sendRequest(SDK.ServerAPI.API.GetDirectoriesLoaders, {});
};
