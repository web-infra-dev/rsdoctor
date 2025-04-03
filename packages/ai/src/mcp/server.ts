import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  Tools,
  getAllChunks,
  getChunkById,
  getModuleDetailById,
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
          description: 'get chunk by id',
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

const resourcesData = {
  resources: {
    static: [],
    dynamic: [],
  },
};

registerStaticResources(server, resourcesData);

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Rsdoctor MCP Server running on stdio');
}

runServer().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
});
