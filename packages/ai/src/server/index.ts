import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { server } from './server.js';

export async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Rsdoctor MCP Server running on stdio');
}
