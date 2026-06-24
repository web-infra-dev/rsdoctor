import { describe, expect, it } from '@rstest/core';
import { RsdoctorRspackPlugin } from './plugin';

describe('RsdoctorRspackPlugin', () => {
  it('keeps the report server when the client server is disabled in CI', () => {
    const originalCI = process.env.CI;
    const originalRSTEST = process.env.RSTEST;

    try {
      process.env.CI = 'true';
      delete process.env.RSTEST;

      const plugin = new RsdoctorRspackPlugin();

      expect(plugin.options.disableClientServer).toBe(true);
      expect(plugin.sdk.server.constructor.name).toBe('RsdoctorServer');
    } finally {
      if (typeof originalCI === 'undefined') {
        delete process.env.CI;
      } else {
        process.env.CI = originalCI;
      }

      if (typeof originalRSTEST === 'undefined') {
        delete process.env.RSTEST;
      } else {
        process.env.RSTEST = originalRSTEST;
      }
    }
  });
});
