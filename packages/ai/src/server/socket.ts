import { Socket, io } from 'socket.io-client';
import { logger } from '@rsdoctor/utils/logger';
import { GlobalConfig } from '@rsdoctor/utils/common';
import fs from 'node:fs';

const map: Record<string, Socket> = {};

// 使用 logger.error 输出日志
export const createSocket = (url: string): Socket => {
  logger.error(map[url]);
  if (map[url]) return map[url];
  const socket = io(url, {});
  logger.error('socket created', url);
  socket.on('connect', () => {
    logger.error(`Socket Connect ${url}`);
  });
  map[url] = socket;
  return socket;
};

export function getPortFromArgs(): number {
  const args = process.argv.slice(2); // Skip the first two elements
  const portIndex = args.indexOf('--port');
  const compilerIndex = args.indexOf('--compiler');
  if (portIndex !== -1 && args[portIndex + 1]) {
    return parseInt(args[portIndex + 1], 10);
  }
  if (portIndex === -1) {
    const port = getMcpPort(
      compilerIndex !== -1 ? args[compilerIndex + 1] : undefined,
    );
    if (port) {
      return port;
    }
  }

  // If no port is specified, use the default port.
  return 3000;
}

export const getWsUrl = async () => {
  const port = getPortFromArgs();
  logger.error(`Socket will start on port: ${port}`);
  return `ws://localhost:${port}`;
};

export const sendRequest = async (api: string, params = {}) => {
  const url = await getWsUrl();
  const socket = createSocket(url);
  logger.error('[mcp]socket client is started');
  const res = await new Promise((resolve) => {
    socket.emit(api, params, (res: any) => {
      resolve(res.res);
    });
  });
  return res;
};

export const getMcpPort = (compiler?: string) => {
  const mcpPortFilePath = GlobalConfig.getMcpConfigPath();

  if (!fs.existsSync(mcpPortFilePath)) {
    return undefined;
  }

  const mcpJson = JSON.parse(fs.readFileSync(mcpPortFilePath, 'utf8'));

  if (compiler) {
    const compilerPort = mcpJson.portList[compiler];
    if (compilerPort) {
      return compilerPort;
    }
  }

  return mcpJson.port;
};
