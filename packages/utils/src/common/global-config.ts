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
 *   socketUrl: socketUrl, // The socket url of the last builder is used by default
 * }
 *
 * @param {number} port - The port number to write.
 * @param {string} [builderName] - The name of the builder.
 * @param {string} [socketUrl] - The socket URL to write.
 */
export function writeMcpPort(
  port: number,
  builderName?: string,
  socketUrl?: string,
) {
  const homeDir = os.homedir();
  const rsdoctorDir = path.join(homeDir, '.cache/rsdoctor');
  const mcpPortFilePath = path.join(rsdoctorDir, 'mcp.json');

  if (!fs.existsSync(rsdoctorDir)) {
    fs.mkdirSync(rsdoctorDir, { recursive: true });
  }

  let mcpJson: {
    portList: Record<string, number>;
    socketUrlList?: Record<string, string>;
    port: number;
    socketUrl?: string;
  } = {
    portList: {},
    port: 0,
  };

  if (fs.existsSync(mcpPortFilePath)) {
    try {
      mcpJson = JSON.parse(fs.readFileSync(mcpPortFilePath, 'utf8'));
    } catch (error) {
      logger.debug('Failed to parse mcp.json', error);
    }
  }

  if (!mcpJson.portList) mcpJson.portList = {};
  mcpJson.portList[builderName || 'builder'] = port;

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
