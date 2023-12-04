/* eslint-disable no-restricted-globals */
import { io, Socket } from 'socket.io-client';

const map = new Map<string, Socket>();
const defaultSocketUrl =
  process.env.NODE_ENV === 'development'
    ? `ws://${location.hostname}:${process.env.LOCAL_CLI_PORT}`
    : `ws://${location.host}`;
function ensureSocket(socketUrl: string = defaultSocketUrl) {
  if (!map.has(socketUrl)) {
    const socket = io(socketUrl, {});
    socket.on('connect', () => {
      console.log(`Scoket Connect ${socketUrl}`);
    });
    map.set(socketUrl, socket);
  }
  return map.get(socketUrl)!;
}
export function getSocket(socketUrl: string = defaultSocketUrl): Socket {
  const socket = ensureSocket(socketUrl);
  return socket;
}
