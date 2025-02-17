import { Socket, io } from 'socket.io-client';

const map: Record<string, Socket> = {};

export const createSocket = (url: string) => {
  console.log(map[url]);
  if (map[url]) return map[url];
  const socket = io(url, {});
  console.log('socket created', url);
  socket.on('connect', () => {
    console.log(`Socket Connect ${url}`);
  });
  map[url] = socket;
  return socket;
};

export const getWsUrl = async () => {
  // TODO: get port from rsdoctor server
  return 'ws://localhost:3021';
};

export const sendRequest = async (api: string, params = {}) => {
  const url = await getWsUrl();
  console.log('url', url);
  const socket = createSocket(url);
  console.log('socket', socket);
  const res = await new Promise((resolve) => {
    socket.emit(api, params, (res: any) => {
      resolve(res.res);
    });
  });
  return res;
};
