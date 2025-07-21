import { describe, it, expect, rs } from '@rstest/core';
import { Manifest, SDK } from '@rsdoctor/types';
import { Manifest as ManifestShared } from '@rsdoctor/utils/common';
import { cwd, setupSDK } from '../../utils';
import { getLocalIpAddress } from '../../../src/sdk/server/utils';

rs.setConfig({ testTimeout: 50000 });

describe('test server/apis/project.ts', () => {
  const target = setupSDK();

  it(`test api: ${SDK.ServerAPI.API.Env}`, async () => {
    const env = (await target.get(SDK.ServerAPI.API.Env)).toJSON();

    expect(env.ip).toEqual(getLocalIpAddress());
    expect(env.port).toEqual(target.server.port);
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
