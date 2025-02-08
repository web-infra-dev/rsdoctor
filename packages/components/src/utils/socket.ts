/* eslint-disable no-restricted-globals */
import { io, Socket } from 'socket.io-client';

const map = new Map<string, Socket>();
const socketProtocol = location.protocol.includes('https') ? 'wss' : 'ws';
const defaultSocketUrl =
  process.env.NODE_ENV === 'development'
    ? `${socketProtocol}://${location.hostname}:${process.env.LOCAL_CLI_PORT}`
    : `${socketProtocol}://${location.host}`;

const ipv4Pattern =
  /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

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

export function getSocket(socketPort?: string): Socket {
  const socketUrl = formatURL({
    port: socketPort,
    hostname: location.hostname,
    protocol: location.protocol,
  });
  const socket = ensureSocket(socketPort ? socketUrl : defaultSocketUrl);
  return socket;
}

export function formatURL({
  port,
  protocol,
  hostname,
}: {
  port?: string;
  protocol: string;
  hostname: string;
}) {
  if (typeof URL !== 'undefined') {
    const url = new URL('http://localhost');
    url.port = String(port);
    url.hostname = hostname;
    url.protocol = location.protocol.includes('https') ? 'wss' : 'ws';
    return ipv4Pattern.test(hostname)
      ? url.toString()
      : `${protocol}//${hostname}`;
  }

  // compatible with IE11
  const colon = protocol.indexOf(':') === -1 ? ':' : '';
  return `${protocol}${colon}//${hostname}:${port}`;
}
