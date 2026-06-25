import fs from 'fs';
import path from 'path';
import os from 'os';
import { logger } from '../logger';

/**
 * @description Writes the builder port information to mcp.json.
 *
 * The mcp.json file uses the following format:
 * {
 *   portList: {
 *     builder1: portNumber,
 *     builder2: portNumber,
 *   },
 *   socketUrlList: {
 *     builder1: socketUrl,
 *     builder2: socketUrl,
 *   },
 *   port: portNumber, // The port of the last builder is used by default
 *   socketUrl: socketUrl, // The socket URL of the last builder is used by default
 * }
 *
 * @param {number} port - The port number to write.
 * @param {string} [builderName] - The name of the builder.
 * @param {string} [socketToken] - The socket token of the builder.
 */
export interface McpConfig {
  portList: Record<string, number>;
  port: number;
  socketUrlList?: Record<string, string>;
  socketUrl?: string;
}

function getMcpSocketUrl(port: number | undefined, socketToken?: string) {
  if (!port || !socketToken) {
    return undefined;
  }

  return `ws://localhost:${port}?token=${encodeURIComponent(socketToken)}`;
}

export function readMcpConfig(): McpConfig | undefined {
  const mcpPortFilePath = getMcpConfigPath();

  if (!fs.existsSync(mcpPortFilePath)) {
    return undefined;
  }

  try {
    return JSON.parse(fs.readFileSync(mcpPortFilePath, 'utf8'));
  } catch (error) {
    logger.debug('Failed to parse mcp.json', error);
    return undefined;
  }
}

export function getMcpServerInfo(builderName?: string): {
  port?: number;
  socketUrl?: string;
} {
  const mcpJson = readMcpConfig();

  if (!mcpJson) {
    return {};
  }

  if (builderName) {
    const port = mcpJson.portList?.[builderName];
    const socketUrl = mcpJson.socketUrlList?.[builderName];

    if (port || socketUrl) {
      return { port, socketUrl };
    }
  }

  return {
    port: mcpJson.port,
    socketUrl: mcpJson.socketUrl,
  };
}

export function writeMcpPort(
  port: number,
  builderName?: string,
  socketToken?: string,
) {
  const homeDir = os.homedir();
  const rsdoctorDir = path.join(homeDir, '.cache/rsdoctor');
  const mcpPortFilePath = path.join(rsdoctorDir, 'mcp.json');

  if (!fs.existsSync(rsdoctorDir)) {
    fs.mkdirSync(rsdoctorDir, { recursive: true });
  }

  const builderKey = builderName || 'builder';
  const socketUrl = getMcpSocketUrl(port, socketToken);
  const mcpJson: McpConfig = readMcpConfig() ?? {
    portList: {},
    port: 0,
  };

  if (!mcpJson.portList) mcpJson.portList = {};
  mcpJson.portList[builderKey] = port;

  if (!mcpJson.socketUrlList) mcpJson.socketUrlList = {};
  if (socketUrl) {
    mcpJson.socketUrlList[builderKey] = socketUrl;
    mcpJson.socketUrl = socketUrl;
  } else {
    delete mcpJson.socketUrlList[builderKey];
    delete mcpJson.socketUrl;
  }

  // Use the latest generated port.
  mcpJson.port = port;

  if (socketUrl) {
    if (!mcpJson.socketUrlList) mcpJson.socketUrlList = {};
    mcpJson.socketUrlList[builderName || 'builder'] = socketUrl;

    // Use the latest generated socket URL.
    mcpJson.socketUrl = socketUrl;
  }

  fs.writeFileSync(mcpPortFilePath, JSON.stringify(mcpJson, null, 2), 'utf8');
}

/**
 * @description Gets the path to the mcp.json file.
 * @returns {string} The path to the mcp.json file.
 */
export function getMcpConfigPath() {
  const homeDir = os.homedir();
  const rsdoctorDir = path.join(homeDir, '.cache/rsdoctor');
  const mcpPortFilePath = path.join(rsdoctorDir, 'mcp.json');
  return mcpPortFilePath;
}
