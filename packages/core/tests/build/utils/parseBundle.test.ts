import { lowerCase } from 'lodash';
import fs from 'fs';
import os from 'os';
import { describe, it, expect } from 'vitest';
import { parseBundle } from '@/build-utils/build/utils/parseBundle';

const BUNDLES_DIR = `${__dirname}/bundles`;

/**
 * Based on [webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer/blob/44bd8d0f9aa3b098e271af220096ea70cc44bc9e/test/parseUtils.js#L8)
 */
describe('parseBundle', function () {
  const bundles = fs
    .readdirSync(BUNDLES_DIR)
    .filter((filename: string) => filename.endsWith('.js'))
    .map((filename: string) => filename.replace(/\.js$/u, ''));

  bundles
    .filter((bundleName: string) => bundleName.startsWith('valid'))
    .forEach((bundleName: string | undefined) => {
      it(`should parse ${lowerCase(bundleName)}`, function () {
        const bundleFile = `${BUNDLES_DIR}/${bundleName}.js`;
        const modules = [
          { renderId: '0', webpackId: '0' },
          { renderId: '1', webpackId: '1' },
          { renderId: '2', webpackId: '2' },
          { renderId: '3', webpackId: '33' },
          { renderId: '5', webpackId: '5' },
          { renderId: '6', webpackId: '6' },
          { renderId: '/x1Yz5', webpackId: '/x1Yz5' },
        ];
        const bundle = parseBundle(bundleFile, modules);

        const expectedModules = JSON.parse(
          fs.readFileSync(`${BUNDLES_DIR}/${bundleName}.modules.json`, {
            encoding: 'utf-8',
          }),
        );
        expect(bundle.src).toEqual(fs.readFileSync(bundleFile, 'utf8'));
        os.EOL === '\n' &&
          expect(bundle.modules).toEqual(expectedModules.modules);
      });
    });
});
