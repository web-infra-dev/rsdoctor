import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from '@rstest/core';
import { inlineClientAssets } from '@/sdk/utils';

describe('inlineClientAssets', () => {
  const directories: string[] = [];

  const createFixture = () => {
    const directory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'rsdoctor-client-'),
    );
    directories.push(directory);
    fs.mkdirSync(path.join(directory, 'resource/js'), { recursive: true });
    fs.mkdirSync(path.join(directory, 'resource/css'), { recursive: true });
    return directory;
  };

  afterEach(() => {
    for (const directory of directories.splice(0)) {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('inlines initial assets when a manifest is not available', () => {
    const directory = createFixture();
    const htmlPath = path.join(directory, 'index.html');
    fs.writeFileSync(
      htmlPath,
      '<html><head><link href="./resource/css/index.css" rel="stylesheet"></head><body><script defer src="./resource/js/index.js"></script></body></html>',
    );
    fs.writeFileSync(path.join(directory, 'resource/css/index.css'), '.app{}');
    fs.writeFileSync(path.join(directory, 'resource/js/index.js'), 'start();');

    const result = inlineClientAssets(htmlPath);

    expect(result).toContain('<style>.app{}</style>');
    expect(result).toContain('<script>start();</script>');
    expect(result).not.toContain('src=');
    expect(result).not.toContain('rel="stylesheet"');
  });

  it('pre-registers only the selected entry async assets', () => {
    const directory = createFixture();
    const htmlPath = path.join(directory, 'index.html');
    fs.writeFileSync(
      htmlPath,
      '<html><body><script defer="defer" src="./resource/js/runtime.js"></script></body></html>',
    );
    fs.writeFileSync(
      path.join(directory, 'rsdoctor-client-manifest.json'),
      JSON.stringify({
        entries: {
          index: {
            async: {
              js: [
                'resource/js/route.js',
                'resource/js/route.js',
                'resource/js/runtime.js',
              ],
              css: ['resource/css/route.css'],
            },
          },
          diff: { async: { js: ['resource/js/diff-route.js'] } },
        },
      }),
    );
    fs.writeFileSync(
      path.join(directory, 'resource/js/runtime.js'),
      'runtime();',
    );
    fs.writeFileSync(path.join(directory, 'resource/js/route.js'), 'route();');
    fs.writeFileSync(
      path.join(directory, 'resource/js/diff-route.js'),
      'diffRoute();',
    );
    fs.writeFileSync(
      path.join(directory, 'resource/css/route.css'),
      '.route{}',
    );

    const result = inlineClientAssets(htmlPath);

    expect(result).toContain(
      '<style data-href="resource/css/route.css">.route{}</style>',
    );
    expect(result.indexOf('route();')).toBeLessThan(
      result.indexOf('runtime();'),
    );
    expect(result.match(/route\(\);/g)).toHaveLength(1);
    expect(result).not.toContain('diffRoute();');
  });

  it('supports an explicit entry for renamed HTML files', () => {
    const directory = createFixture();
    const htmlPath = path.join(directory, 'custom-report.html');
    fs.writeFileSync(htmlPath, '<html><body></body></html>');
    fs.writeFileSync(
      path.join(directory, 'rsdoctor-client-manifest.json'),
      JSON.stringify({
        entries: {
          index: { async: { js: ['resource/js/route.js'] } },
        },
      }),
    );
    fs.writeFileSync(path.join(directory, 'resource/js/route.js'), 'route();');

    expect(inlineClientAssets(htmlPath, 'index')).toContain(
      '<script>route();</script>',
    );
  });

  it('escapes closing tags in inlined assets', () => {
    const directory = createFixture();
    const htmlPath = path.join(directory, 'index.html');
    fs.writeFileSync(
      htmlPath,
      '<html><head><link rel="stylesheet" href="resource/css/index.css"></head><body><script src="resource/js/index.js"></script></body></html>',
    );
    fs.writeFileSync(
      path.join(directory, 'resource/js/index.js'),
      'const value = "</script>";',
    );
    fs.writeFileSync(
      path.join(directory, 'resource/css/index.css'),
      '.x::after{content:"</style>"}',
    );

    const result = inlineClientAssets(htmlPath);

    expect(result).toContain('<\\/script>');
    expect(result).toContain('<\\/style>');
  });
});
