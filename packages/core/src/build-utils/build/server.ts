import { connect } from 'connect-next';
import http from 'http';
import os from 'os';
import gp from 'get-port';
import type { AddressInfo } from 'net';
import { execFileSync } from 'child_process';
import { Thirdparty } from '@rsdoctor/shared/types';

const MAX_PORT_ATTEMPTS = 20;

export const defaultHost = '127.0.0.1';
export const defaultPort = 0;

function validatePort(port: unknown): number {
  if (
    typeof port !== 'number' ||
    !Number.isInteger(port) ||
    port < 0 ||
    port > 65_535
  ) {
    throw new RangeError(`Invalid port: ${String(port)}`);
  }

  return port;
}

export async function getPort(expectPort: number, host = defaultHost) {
  return gp({ port: expectPort, host });
}

export const createGetPortSyncFunctionString = (
  expectPort: number,
  host = defaultHost,
) => {
  const port = validatePort(expectPort);

  return `
(() => {
const net = require('net');

function getPort(expectPort, host) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(expectPort, host, () => {
      const { port } = server.address();
      server.close(() => {
        resolve(port);
      });
    });
  });
}

async function getAvailablePort(expectPort) {
  let port = expectPort;
  let attempts = 0;
  while (true) {
    try {
      return await getPort(port, ${JSON.stringify(host)});
    } catch (error) {
      if (port === 0) throw error;
      if (error.code === 'EACCES') {
        port = 0;
      } else if (error.code === 'EADDRINUSE') {
        attempts++;
        port = attempts >= ${MAX_PORT_ATTEMPTS} || port === 65_535 ? 0 : port + 1;
      } else {
        throw error;
      }
    }
  }
}

getAvailablePort(${port}).then(
  port => process.stdout.write(port.toString()),
  error => {
    process.stderr.write(String(error.code || error.message));
    process.exit(1);
  },
);
})();
`.trim();
};

export function getPortSync(
  expectPort: number,
  host = defaultHost,
): number | never {
  const statement =
    os.EOL === '\n'
      ? createGetPortSyncFunctionString(expectPort, host)
      : createGetPortSyncFunctionString(expectPort, host).replace(/\n/g, '');

  const port = execFileSync(process.execPath, ['-e', statement], {
    encoding: 'utf-8',
  });

  return Number(port);
}

export function createApp() {
  return connect();
}

export async function createServer(
  port: number,
  host = defaultHost,
): Promise<{
  app: Thirdparty.connect.Server;
  server: http.Server;
  port: number;
  close(): Promise<void> | never;
}> {
  const app = createApp();
  const server = http.createServer(app);

  const res = {
    app,
    server,
    port,
    close() {
      return new Promise<void>((resolve, reject) => {
        if ('closeAllConnections' in server) {
          (server as any).closeAllConnections();
        }
        if ('closeIdleConnections' in server) {
          (server as any).closeIdleConnections();
        }

        server.close((err) => {
          if (err) reject(err);
          resolve();
        });
      });
    },
  };

  return new Promise<typeof res>((resolve, reject) => {
    const onError = (error: Error) => {
      reject(error);
    };
    server.once('error', onError);
    server.listen(port, host, () => {
      server.off('error', onError);
      res.port = (server.address() as AddressInfo).port;
      resolve(res);
    });
  });
}
