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
} from './tools.js';
import { registerStaticResources } from './resource.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

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
  `get module detail by id：
    - id: the id of the module
    - issuerPath: the dependencies of the module, the issuerPath is a array of module id, the module id is the id of the module that depends on the module.
    - dependencies: the complete dependencies of the module, when user ask the dependencies of the module, 
      please return the dependencies of the module first, not return the allDependencies of the module. 
      But if user ask the detail dependencies of the module, please return the allDependencies of the module.
    - allDependencies: the complete dependencies of the module. 
      when user ask the dependencies of the module, please return the dependencies of the module first, not return the allDependencies of the module. 
    - chunks: an array of chunk identifiers associated with the module.
    - imported: an array of module identifiers on which the module depends.
    - isEntry: indicates if the module is an entry module.
    - size: the size of the module.
    - layer: the layer of the module.
    - modules: connected base subpackage module numbers.
    - rootModule: the root module.
    - webpackId: the module's unique identifier in webpack.
  `,
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
  `get module detail by module name or path, if find multiple modules match the name or path, return all matched modules path, stop execution, and let user select the module path。
    - id: the id of the module
    - issuerPath: the dependencies of the module, the issuerPath is a array of module id, the module id is the id of the module that depends on the module.
    - dependencies: the complete dependencies of the module, when user ask the dependencies of the module, 
      please return the dependencies of the module first, not return the allDependencies of the module. 
      But if user ask the detail dependencies of the module, please return the allDependencies of the module.
    - allDependencies: the complete dependencies of the module. 
      when user ask the dependencies of the module, please return the dependencies of the module first, not return the allDependencies of the module. 
    - chunks: an array of chunk identifiers associated with the module.
    - imported: an array of module identifiers on which the module depends.
    - isEntry: indicates if the module is an entry module.
    - size: the size of the module.
    - layer: the layer of the module.
    - modules: connected base subpackage module numbers.
    - rootModule: the root module.
    - webpackId: the module's unique identifier in webpack.
  `,
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
  `get module issuer path, issuer path is the path of the module that depends on the module.Please draw the returned issuer path as a dependency diagram.
  - The values in the array are module ids, please get the detailed module information based on the module id
  `,
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

server.tool(
  Tools.GetPackageInfo,
  `get package info, the package info is a Record<{id: number, name: string, version: string, root: string, modules: string[], duplicates: Record<{module: string, chunks: string[]}>}>, where:
  - id: an incremental sequence mark, the package id.
  - name: the name of the package
  - version: the version of the package
  - modules: the modules of the package
  - root: the root path of the package
  - duplicates: the duplicates of the package
  `,
  {},
  async () => {
    const res = await getPackageInfo();
    return {
      content: [
        {
          name: Tools.GetPackageInfo,
          description: 'get package info',
          type: 'text',
          text: JSON.stringify(res),
        },
      ],
    };
  },
);

server.tool(
  Tools.GetPackageDependency,
  `Get package dependencies, which is the package Graph. The dependency structure is a Record<{id: number, dependency: number, package: number, refDependency: number}>, where:
  - id: an incremental sequence mark
  - dependency: the upstream dependency of the package
  - package: the id of the package where the current Module is located
  - refDependency: the Id of the upstream dependency Module of the current Module`,
  {},
  async () => {
    const res = await getPackageDependency();
    return {
      content: [
        {
          name: Tools.GetPackageDependency,
          description: 'get package dependency',
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
