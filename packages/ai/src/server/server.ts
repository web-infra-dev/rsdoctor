import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  Tools,
  getAllChunks,
  getChunkById,
  getModuleDetailById,
  getModuleByPath,
  getModuleIssuerPath,
} from './tools.js';
import { registerStaticResources } from './resource.js';

// Create an MCP server
export const server = new McpServer({
  name: 'RsdoctorAnalyticsMCPServer',
  version: '1.0.0',
});

server.tool(Tools.GetAllChunks, 'get all chunks', {}, async () => {
  const res = await getAllChunks();
  return {
    content: [
      {
        name: Tools.GetAllChunks,
        description: 'get all chunks',
        type: 'text',
        text: JSON.stringify(res),
      },
    ],
  };
});

server.tool(
  Tools.GetChunkById,
  'get chunk by id',
  { chunkId: z.number() },
  async ({ chunkId }) => {
    const res = await getChunkById(chunkId);
    return {
      content: [
        {
          name: Tools.GetChunkById,
          description:
            'get chunk by id, if chunk not found, return `Chunk not found`, and stop the execution',
          type: 'text',
          text: JSON.stringify(res),
        },
      ],
    };
  },
);

server.tool(
  Tools.GetModuleById,
  'get module detail by id',
  { moduleId: z.number() },
  async ({ moduleId }) => {
    const res = await getModuleDetailById(moduleId);
    return {
      content: [
        {
          prompt: '',
          name: Tools.GetModuleById,
          description: 'get module detail by id',
          type: 'text',
          text: JSON.stringify(res),
        },
      ],
    };
  },
);

server.tool(
  Tools.GetModuleByPath,
  'get module detail by module name or path, if find multiple modules match the name or path, return all matched modules path, stop execution, and let user select the module path',
  { modulePath: z.string() },
  async ({ modulePath }) => {
    const res = await getModuleByPath(modulePath);

    return {
      content: [
        {
          name: Tools.GetModuleByPath,
          description:
            'get module detail by module name or path, if find multiple modules match the name or path, return all matched modules path, stop execution, and let user select the module path',
          type: 'text',
          text: JSON.stringify(res),
        },
      ],
    };
  },
);

server.tool(
  Tools.GetModuleIssuerPath,
  'get module issuer path, issuer path is the path of the module that depends on the module.Please draw the returned issuer path as a dependency diagram.',
  { moduleId: z.string() },
  async ({ moduleId }) => {
    const res = await getModuleIssuerPath(moduleId);
    return {
      content: [
        {
          name: Tools.GetModuleIssuerPath,
          description:
            'get module issuer path, issuer path is the path of the module that depends on the module.Please draw the returned issuer path as a dependency diagram.',
          type: 'text',
          text: JSON.stringify(res),
        },
      ],
    };
  },
);

registerStaticResources(server);
