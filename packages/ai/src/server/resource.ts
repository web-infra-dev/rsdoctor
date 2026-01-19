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
  // Extract the filename from the URI pathname
  // The URI format is file://rsdoctor/<filename>
  const requestedPath = uri.pathname;

  // Security: Validate that the pathname is a simple filename without path traversal
  // This prevents attacks like file://rsdoctor/../../etc/passwd
  const filename = path.basename(requestedPath);

  // Additional security check: ensure the filename only contains safe characters
  // and doesn't contain path traversal sequences
  if (
    !filename ||
    filename !== requestedPath.replace(/^\//, '') ||
    /\.\./.test(requestedPath)
  ) {
    throw new Error('Invalid resource path: path traversal detected');
  }

  // Construct the safe file path within the resources directory
  const resourcesDir = path.join(__dirname, './resources');
  const filePath = path.join(resourcesDir, filename);

  // Additional security: Verify the resolved path is still within the resources directory
  const resolvedPath = path.resolve(filePath);
  const resolvedResourcesDir = path.resolve(resourcesDir);
  const relativePath = path.relative(resolvedResourcesDir, resolvedPath);

  // Check if the relative path starts with '..' or is an absolute path
  // This prevents both upward traversal and accessing files outside the directory
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error('Invalid resource path: access denied');
  }

  // Read the contents of the Markdown file
  const contents = await readFileAsync(filePath, 'utf-8');

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
