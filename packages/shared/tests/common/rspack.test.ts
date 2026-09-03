import { describe, expect, it } from 'rstack/test';
import { Rspack } from '../../src/common-browser';
import type { SDK } from '../../src/types';

const createConfig = (
  config: SDK.BundlerConfigData['config'],
): SDK.BundlerConfigData => ({
  name: 'rspack',
  version: '1.0.0',
  config,
  root: '/',
});

describe('checkSourceMapSupport', () => {
  it('identifies Lynx projects', () => {
    expect(
      Rspack.checkSourceMapSupport([createConfig({ name: 'lynx' })]),
    ).toMatchObject({
      isRspack: false,
      isLynx: true,
      isEvalSourceMap: false,
    });
  });

  it.each([
    'eval',
    'eval-source-map',
    'eval-cheap-module-source-map',
    'inline-eval-source-map',
  ])('identifies the %s devtool as an eval source map', (devtool) => {
    expect(
      Rspack.checkSourceMapSupport([createConfig({ devtool })]),
    ).toMatchObject({
      hasSourceMap: false,
      isEvalSourceMap: true,
    });
  });

  it.each([false, 'source-map', 'cheap-module-source-map'])(
    'does not identify the %s devtool as an eval source map',
    (devtool) => {
      expect(
        Rspack.checkSourceMapSupport([createConfig({ devtool })]),
      ).toMatchObject({
        isEvalSourceMap: false,
      });
    },
  );
});
