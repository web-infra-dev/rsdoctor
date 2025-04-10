import { Socket, io } from 'socket.io-client';
import { logger } from '@rsdoctor/utils/logger';

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
  if (portIndex !== -1 && args[portIndex + 1]) {
    return parseInt(args[portIndex + 1], 10);
  }
  return 3000; // Default port if not specified
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
