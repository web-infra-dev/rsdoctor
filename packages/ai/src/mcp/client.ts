import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['./dist/server.js'],
});

export const client = new Client(
  {
    name: 'RsdoctorAnalyticsMCPClient',
    version: '1.0.0',
  },
  {
    capabilities: {
      prompts: {},
      resources: {},
      tools: {},
    },
  },
);

export const runClient = async () => {
  await client.connect(transport);
};
