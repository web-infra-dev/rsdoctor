import {
  McpServer,
  ReadResourceCallback,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import path, { dirname } from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const readFileAsync = promisify(fs.readFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readMarkdownResource: ReadResourceCallback = async (uri: URL) => {
  // Read the contents of the Markdown file
  const contents = await readFileAsync(
    path.join(__dirname, './resources', uri.pathname),
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
function registerStaticResources(server: McpServer) {
  const resourcesDir = path.join(__dirname, './resources/');
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
