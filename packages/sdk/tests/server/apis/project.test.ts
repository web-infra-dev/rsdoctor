import { describe, it, expect, rs } from '@rstest/core';
import { Manifest, SDK } from '@rsdoctor/types';
import { Manifest as ManifestShared } from '@rsdoctor/utils/common';
import { request } from 'http';
import { cwd, setupSDK } from '../../utils';
import { getLocalIpAddress } from '../../../src/sdk/server/utils';

rs.setConfig({ testTimeout: 50000 });

describe('test server/apis/project.ts', () => {
  const target = setupSDK();

  function optionsWithOrigin(origin: string) {
    return new Promise<{
      statusCode: number;
      allowOrigin: string | string[] | undefined;
    }>((resolve, reject) => {
      const url = new URL(
        `${target.server.origin}${SDK.ServerAPI.API.Manifest}`,
      );
      const req = request(
        {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname,
          method: 'OPTIONS',
          headers: { Origin: origin },
        },
        (res) => {
          res.on('data', () => {});
          res.on('close', () => {
            resolve({
              statusCode: res.statusCode || 0,
              allowOrigin: res.headers['access-control-allow-origin'],
            });
          });
        },
      );

      req.on('error', reject);
      req.end();
    });
  }

  function socketHandshakeWithOrigin(origin: string) {
    return new Promise<{
      statusCode: number;
      allowOrigin: string | string[] | undefined;
    }>((resolve, reject) => {
      const url = new URL(target.server.origin);
      const req = request(
        {
          hostname: url.hostname,
          port: url.port,
          path: '/socket.io/?EIO=4&transport=polling',
          method: 'GET',
          headers: { Origin: origin },
        },
        (res) => {
          res.on('data', () => {});
          res.on('close', () => {
            resolve({
              statusCode: res.statusCode || 0,
              allowOrigin: res.headers['access-control-allow-origin'],
            });
          });
        },
      );

      req.on('error', reject);
      req.end();
    });
  }

  it(`test api: ${SDK.ServerAPI.API.Env}`, async () => {
    const env = (await target.get(SDK.ServerAPI.API.Env)).toJSON();

    expect(env.ip).toEqual(getLocalIpAddress());
    expect(env.port).toEqual(target.server.port);
  });

  it('only allows local CORS preflight requests', async () => {
    await expect(
      optionsWithOrigin('https://example.com'),
    ).resolves.toStrictEqual({
      statusCode: 403,
      allowOrigin: undefined,
    });

    await expect(
      optionsWithOrigin(`http://127.0.0.1:${target.server.port}`),
    ).resolves.toStrictEqual({
      statusCode: 204,
      allowOrigin: `http://127.0.0.1:${target.server.port}`,
    });

    await expect(
      optionsWithOrigin(`http://127.0.0.1:${target.server.port + 1}`),
    ).resolves.toStrictEqual({
      statusCode: 204,
      allowOrigin: `http://127.0.0.1:${target.server.port + 1}`,
    });
  });

  it('only allows local Socket.IO origins', async () => {
    await expect(
      socketHandshakeWithOrigin('https://example.com'),
    ).resolves.toStrictEqual({
      statusCode: 403,
      allowOrigin: undefined,
    });

    await expect(
      socketHandshakeWithOrigin(`http://127.0.0.1:${target.server.port}`),
    ).resolves.toStrictEqual({
      statusCode: 200,
      allowOrigin: `http://127.0.0.1:${target.server.port}`,
    });
  });

  it('uses the bound host for socket URLs', async () => {
    const socket = (
      target.server as unknown as {
        socketUrl: { port: number; socketUrl: string };
      }
    ).socketUrl;

    expect(socket).toStrictEqual({
      port: target.server.port,
      socketUrl: `ws://127.0.0.1:${target.server.port}`,
    });
  });

  it(`test api: ${SDK.ServerAPI.API.Manifest}`, async () => {
    target.sdk.addClientRoutes([
      Manifest.RsdoctorManifestClientRoutes.WebpackLoaders,
    ]);

    const manifestStr = (
      await target.get(SDK.ServerAPI.API.Manifest)
    ).toString();
    const manifest: Manifest.RsdoctorManifest = JSON.parse(manifestStr);

    expect(manifest.data.root === cwd);
    expect(manifest.client.enableRoutes).toStrictEqual([
      Manifest.RsdoctorManifestClientRoutes.Overall,
      Manifest.RsdoctorManifestClientRoutes.WebpackLoaders,
    ]);
    expect(manifest.data.pid).toEqual(process.pid);

    // expect the value in manifest.data is sharding files url.
    Object.keys(manifest.data)
      .filter((key) => typeof manifest.data[key] === 'object')
      .forEach((key) => {
        expect(manifest.data[key]).toBeInstanceOf(Array);
        expect(ManifestShared.isShardingData(manifest.data[key])).toBeTruthy();
      });
  });
});
