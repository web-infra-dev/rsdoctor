import { io, type Socket } from 'socket.io-client';
import { logger } from '@rsdoctor/utils/logger';
import { GlobalConfig } from '@rsdoctor/utils/common';

const map: Record<string, Socket> = {};
const SOCKET_REQUEST_TIMEOUT_MS = 10_000;

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
  const portIndex = args.indexOf('--port');
  const compilerIndex = args.indexOf('--compiler');

  if (socketUrlIndex !== -1 && args[socketUrlIndex + 1]) {
    return args[socketUrlIndex + 1];
  }

  if (portIndex !== -1 && args[portIndex + 1]) {
    return GlobalConfig.getMcpServerInfoByPort(
      parseInt(args[portIndex + 1], 10),
    ).socketUrl;
  }

  return getMcpSocketUrl(
    compilerIndex !== -1 ? args[compilerIndex + 1] : undefined,
  );
}

export const getWsUrl = async () => {
  const socketUrl = getSocketUrlFromArgs();
  if (socketUrl) {
    logger.error(`Socket will start on url: ${redactSocketToken(socketUrl)}`);
    return socketUrl;
  }

  const port = getPortFromArgs();
  logger.error(`Socket will start on port: ${port}`);
  return `ws://localhost:${port}`;
};

export async function emitSocketRequest(
  socket: Socket,
  api: string,
  params: object,
  timeout = SOCKET_REQUEST_TIMEOUT_MS,
) {
  return (await socket.timeout(timeout).emitWithAck(api, params)) as {
    res: unknown;
  };
}

export const sendRequest = async (api: string, params = {}) => {
  const url = await getWsUrl();
  const socket = createSocket(url);
  logger.error('[mcp]socket client is started');

  try {
    const response = await emitSocketRequest(socket, api, params);
    return response.res;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Rsdoctor request "${api}" failed for ${redactSocketToken(url)}: ${message}. Make sure the Rsdoctor local server is running and the cached MCP address is current.`,
      { cause: error },
    );
  }
};

export const getMcpPort = (compiler?: string) => {
  return GlobalConfig.getMcpServerInfo(compiler).port;
};

export const getMcpSocketUrl = (compiler?: string) => {
  return GlobalConfig.getMcpServerInfo(compiler).socketUrl;
};
