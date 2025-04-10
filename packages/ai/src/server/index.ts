import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { server } from './server.js';

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Rsdoctor MCP Server running on stdio');
}

runServer().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
});
