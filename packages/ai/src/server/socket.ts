import { Socket, io } from 'socket.io-client';
import { logger } from '@rsdoctor/utils/logger';
import { GlobalConfig } from '@rsdoctor/utils/common';

const map: Record<string, Socket> = {};

function redactSocketToken(url: string) {
  return url.replace(/([?&]token=)[^&]+/, '$1<redacted>');
}

// Use logger.error to output logs.
export const createSocket = (url: string): Socket => {
  if (map[url]) return map[url];
  const socket = io(url, {});
  logger.error('socket created', redactSocketToken(url));
  socket.on('connect', () => {
    logger.error(`Socket Connect ${redactSocketToken(url)}`);
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

export function getSocketUrlFromArgs(): string | undefined {
  const args = process.argv.slice(2); // Skip the first two elements
  const socketUrlIndex = args.indexOf('--socket-url');
  const compilerIndex = args.indexOf('--compiler');

  if (socketUrlIndex !== -1 && args[socketUrlIndex + 1]) {
    return args[socketUrlIndex + 1];
  }

  return getMcpSocketUrl(
    compilerIndex !== -1 ? args[compilerIndex + 1] : undefined,
  );
}

export const getWsUrl = async () => {
  const args = process.argv.slice(2);
  const portIndex = args.indexOf('--port');
  const compilerIndex = args.indexOf('--compiler');
  const compiler = compilerIndex !== -1 ? args[compilerIndex + 1] : undefined;
  const serverInfo = GlobalConfig.getMcpServerInfo(compiler);
  const port = getPortFromArgs();
  const socketUrl =
    serverInfo.socketUrl && (portIndex === -1 || serverInfo.port === port)
      ? serverInfo.socketUrl
      : `ws://localhost:${port}`;
  logger.error(`Socket will start on port: ${port}`);
  return socketUrl;
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
  return GlobalConfig.getMcpServerInfo(compiler).port;
};

export const getMcpSocketUrl = (compiler?: string) => {
  const mcpPortFilePath = GlobalConfig.getMcpConfigPath();

  if (!fs.existsSync(mcpPortFilePath)) {
    return undefined;
  }

  const mcpJson = JSON.parse(fs.readFileSync(mcpPortFilePath, 'utf8'));

  if (compiler) {
    const compilerSocketUrl = mcpJson.socketUrlList?.[compiler];
    if (compilerSocketUrl) {
      return compilerSocketUrl;
    }
  }

  return mcpJson.socketUrl;
};
