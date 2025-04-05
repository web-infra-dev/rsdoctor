import { SDK } from '@rsdoctor/types';
import { sendRequest } from './socket.js';

export enum Tools {
  GetAllChunks = 'get_chunks',
  GetChunkById = 'get_chunk_by_id',
  GetAllModules = 'get_modules',
  GetModuleById = 'get_module_by_id',
  GetModuleByPath = 'get_module_by_path',
  GetModuleIssuerPath = 'get_module_issuer_path',
}

// Define the type for the response of getAllChunks
export type GetAllChunksResponse = {
  isError: boolean;
  content: any; // Replace 'any' with the actual type of data if known
};

export const getAllChunks = async () => {
  return await sendRequest(SDK.ServerAPI.API.GetChunkGraph, {});
};

export const getChunkById = async (chunkId: number) => {
  const chunks = (await getAllChunks()) as any[];
  const chunk = chunks.find((i: any) => i.id === String(chunkId));
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

export const getModuleByName = async (moduleName: string) => {
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

export const getModuleById = async (
  moduleId: string,
): Promise<
  SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetModuleDetails>
> => {
  return (await sendRequest(SDK.ServerAPI.API.GetModuleDetails, {
    moduleId,
  })) as SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetModuleDetails>;
};
