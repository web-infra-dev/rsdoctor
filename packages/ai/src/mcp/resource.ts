import {
  McpServer,
  ReadResourceCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';

const readFileAsync = promisify(fs.readFile);

const readMarkdownResource: ReadResourceCallback = async (
  uri: URL,
  extra: RequestHandlerExtra,
) => {
  // Read the contents of the Markdown file
  const contents = await readFileAsync(
    path.join(__dirname, 'resources', uri.pathname),
    'utf-8',
  );

  return {
    contents: [
      {
        uri: uri.href,
        mimeType: 'text/markdown',
        text: contents,
      },
    ],
  };
};

/**
 * This function iterates through the resources directory, identifies Markdown files, and registers them as static resources with the server.
 * The resource name is derived from the filename without the extension.
 *
 * @param {McpServer} server - The server object to register resources with
 * @param {Object} resourcesData - The resources data object containing static resources
 */
function registerStaticResources(server: McpServer, _resourcesData: any) {
  const resourcesDir = path.join(__dirname, 'resources');
  fs.readdirSync(resourcesDir).forEach((file) => {
    if (file.endsWith('.md')) {
      const uri = `file://rsdoctor/${file}`;
      server.resource(
        file.replace('.md', ''), // Use the filename without extension as the resource name
        uri,
        readMarkdownResource,
      );
    }
  });
}

export { registerStaticResources };
