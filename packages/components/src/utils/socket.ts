/* eslint-disable no-restricted-globals */
import { io, Socket } from 'socket.io-client';

const map = new Map<string, Socket>();
const socketProtocol = location.protocol.includes('https') ? 'wss' : 'ws';
const defaultSocketUrl =
  process.env.NODE_ENV === 'development'
    ? `${socketProtocol}://${location.hostname}:${process.env.LOCAL_CLI_PORT}`
    : `${socketProtocol}://${location.host}`;
function ensureSocket(socketUrl: string = defaultSocketUrl) {
  if (!map.has(socketUrl)) {
    const socket = io(socketUrl, {});
    socket.on('connect', () => {
      console.log(`Socket Connect ${socketUrl}`);
    });
    map.set(socketUrl, socket);
  }
  return map.get(socketUrl)!;
}
export function getSocket(socketUrl?: string): Socket {
  const socket = ensureSocket(socketUrl || defaultSocketUrl);
  return socket;
}
