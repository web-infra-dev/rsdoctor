import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  Tools,
  getAllChunks,
  getChunkById,
  getModuleDetailById,
  getModuleByPath,
  getModuleIssuerPath,
  getPackageInfo,
  getPackageDependency,
  getRuleInfo,
} from './tools.js';
import { registerStaticResources } from './resource.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { toolDescriptions } from '../prompt/bundle.js';

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
        description: toolDescriptions.getAllChunks,
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
          description: toolDescriptions.getChunkById,
          type: 'text',
          text: JSON.stringify(res),
        },
      ],
    };
  },
);

server.tool(
  Tools.GetModuleById,
  toolDescriptions.getModuleById,
  { moduleId: z.number() },
  async ({ moduleId }) => {
    const res = await getModuleDetailById(moduleId);
    return {
      content: [
        {
          prompt: '',
          name: Tools.GetModuleById,
          description: toolDescriptions.getModuleById,
          type: 'text',
          text: JSON.stringify(res),
        },
      ],
    };
  },
);

server.tool(
  Tools.GetModuleByPath,
  toolDescriptions.getModuleByPath,
  { modulePath: z.string() },
  async ({ modulePath }) => {
    const res = await getModuleByPath(modulePath);

    return {
      content: [
        {
          name: Tools.GetModuleByPath,
          description: toolDescriptions.getModuleByPath,
          type: 'text',
          text: JSON.stringify(res),
        },
      ],
    };
  },
);

server.tool(
  Tools.GetModuleIssuerPath,
  toolDescriptions.getModuleIssuerPath,
  { moduleId: z.string() },
  async ({ moduleId }) => {
    const res = await getModuleIssuerPath(moduleId);
    return {
      content: [
        {
          name: Tools.GetModuleIssuerPath,
          description: toolDescriptions.getModuleIssuerPath,
          type: 'text',
          text: JSON.stringify(res),
        },
      ],
    };
  },
);

server.tool(
  Tools.GetPackageInfo,
  toolDescriptions.getPackageInfo,
  {},
  async () => {
    const res = await getPackageInfo();
    return {
      content: [
        {
          name: Tools.GetPackageInfo,
          description: toolDescriptions.getPackageInfo,
          type: 'text',
          text: JSON.stringify(res),
        },
      ],
    };
  },
);

server.tool(
  Tools.GetPackageDependency,
  toolDescriptions.getPackageDependency,
  {},
  async () => {
    const res = await getPackageDependency();
    return {
      content: [
        {
          name: Tools.GetPackageDependency,
          description: toolDescriptions.getPackageDependency,
          type: 'text',
          text: JSON.stringify(res),
        },
      ],
    };
  },
);

server.tool(Tools.GetRuleInfo, toolDescriptions.getRuleInfo, {}, async () => {
  const res = await getRuleInfo();
  return {
    content: [
      {
        name: Tools.GetRuleInfo,
        description: toolDescriptions.getRuleInfo,
        type: 'text',
        text: JSON.stringify(res),
      },
    ],
  };
});

server.tool(
  Tools.GetSimilarPackages,
  toolDescriptions.getSimilarPackages,
  {},
  async () => {
    const res = await getPackageInfo();
    return {
      content: [
        {
          name: Tools.GetSimilarPackages,
          description: toolDescriptions.getSimilarPackages,
          type: 'text',
          text: JSON.stringify(res),
        },
      ],
    };
  },
);

registerStaticResources(server);
export async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Rsdoctor MCP Server running on stdio');
}
