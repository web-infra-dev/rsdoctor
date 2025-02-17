import { SDK } from '@rsdoctor/types';
import { sendRequest } from './socket.js';

export enum Tools {
  GetAllChunks = 'get_chunks',
  GetChunkById = 'get_chunk_by_id',
  GetAllModules = 'get_modules',
  GetModuleById = 'get_module_by_id',
}

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
