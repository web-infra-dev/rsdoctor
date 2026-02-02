import { lowerCase } from 'es-toolkit/compat';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, it, expect } from '@rstest/core';
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

  it('should remove inline sourcemap from bundle content', function () {
    const tmpDir = os.tmpdir();
    const testBundlePath = path.join(tmpDir, 'test-bundle-with-sourcemap.js');
    const bundleCode = `(function() {
  var modules = {
    0: function() { console.log('module 0'); }
  };
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IiJ9`;

    try {
      fs.writeFileSync(testBundlePath, bundleCode, 'utf8');

      const modules = [{ renderId: '0', webpackId: '0' }];
      const result = parseBundle(testBundlePath, modules);

      // Verify that sourcemap is removed from src
      expect(result.src).not.toContain('sourceMappingURL');
      expect(result.src).not.toContain('data:application/json;base64');
      // Verify that the actual code is preserved
      expect(result.src).toContain('console.log');
    } finally {
      if (fs.existsSync(testBundlePath)) {
        fs.unlinkSync(testBundlePath);
      }
    }
  });

  it('should remove inline sourcemap with file path', function () {
    const tmpDir = os.tmpdir();
    const testBundlePath = path.join(tmpDir, 'test-bundle-sourcemap-file.js');
    const bundleCode = `(function() {
  var modules = {
    0: function() { console.log('module 0'); }
  };
})();
//# sourceMappingURL=bundle.js.map`;

    try {
      fs.writeFileSync(testBundlePath, bundleCode, 'utf8');

      const modules = [{ renderId: '0', webpackId: '0' }];
      const result = parseBundle(testBundlePath, modules);

      // Verify that sourcemap is removed from src
      expect(result.src).not.toContain('sourceMappingURL');
      expect(result.src).not.toContain('bundle.js.map');
      // Verify that the actual code is preserved
      expect(result.src).toContain('console.log');
    } finally {
      if (fs.existsSync(testBundlePath)) {
        fs.unlinkSync(testBundlePath);
      }
    }
  });

  it('should parse bundle files with .bundle extension', function () {
    const bundleFile = `${BUNDLES_DIR}/validBundleWithArrowFunction.bundle`;
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
      fs.readFileSync(
        `${BUNDLES_DIR}/validBundleWithArrowFunction.bundle.modules.json`,
        {
          encoding: 'utf-8',
        },
      ),
    );
    expect(bundle.src).toEqual(fs.readFileSync(bundleFile, 'utf8'));
    os.EOL === '\n' && expect(bundle.modules).toEqual(expectedModules.modules);
  });

  it('should return empty object for non-js and non-bundle files', function () {
    const tmpDir = os.tmpdir();
    const testFilePath = path.join(tmpDir, 'test-file.css');

    try {
      fs.writeFileSync(testFilePath, '.test { color: red; }', 'utf8');

      const modules = [{ renderId: '0', webpackId: '0' }];
      const result = parseBundle(testFilePath, modules);

      // Should return empty object for non-JS/bundle files
      expect(result).toEqual({});
    } finally {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  });
});
