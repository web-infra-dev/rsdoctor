import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { RsdoctorRspackPlugin } from '@rsdoctor/core';
import { execute } from '@rsdoctor/cli';
import { rspack } from '@rspack/core';

const require = createRequire(import.meta.url);
const consumer = fileURLToPath(new URL('.', import.meta.url));

test('packed packages run on the minimum supported Node.js version', async () => {
  if (process.env.EXPECTED_NODE_VERSION) {
    assert.equal(process.versions.node, process.env.EXPECTED_NODE_VERSION);
  }
  for (const name of ['core', 'shared', 'client', 'cli', 'agent-cli']) {
    const resolved = await realpath(require.resolve(`@rsdoctor/${name}`));
    assert.ok(
      resolved.startsWith(
        path.join(await realpath(consumer), 'node_modules') + path.sep,
      ),
    );
  }
  assert.equal(
    require('@rsdoctor/core').RsdoctorRspackPlugin,
    RsdoctorRspackPlugin,
  );
  for (const bin of [
    '@rsdoctor/cli/bin/rsdoctor',
    '@rsdoctor/agent-cli/bin/rsdoctor-agent.js',
  ]) {
    const output = execFileSync(
      process.execPath,
      [path.join(consumer, 'node_modules', bin), '--help'],
      {
        encoding: 'utf8',
        timeout: 15_000,
      },
    );
    assert.match(output, /Usage/);
  }

  const root = await mkdtemp(path.join(tmpdir(), 'rsdoctor-runtime-'));
  const plugin = new RsdoctorRspackPlugin({ disableClientServer: true });
  let compiler;
  let sdk;
  try {
    await writeFile(
      path.join(root, 'entry.js'),
      "console.log('entry'); import('./lazy.js').then(console.log);\n",
    );
    await writeFile(path.join(root, 'lazy.js'), 'export default 42;\n');
    await writeFile(
      path.join(root, 'loader.cjs'),
      'module.exports = source => source;\n',
    );
    compiler = rspack({
      context: root,
      mode: 'production',
      entry: './entry.js',
      devtool: 'source-map',
      output: { path: path.join(root, 'dist') },
      module: {
        rules: [{ test: /\.js$/, use: [path.join(root, 'loader.cjs')] }],
      },
      plugins: [plugin],
    });
    const stats = await new Promise((resolve, reject) => {
      compiler.run((error, result) =>
        error ? reject(error) : resolve(result),
      );
    });
    assert.equal(stats.hasErrors(), false, stats.toString());
    const profile = path.join(root, 'dist/.rsdoctor/manifest.json');
    assert.ok(JSON.parse(await readFile(profile, 'utf8')).data);
    sdk = await execute('analyze', { profile, open: false });
    const store = sdk.getStoreData();
    assert.ok(
      store.moduleGraph.modules.some((module) =>
        JSON.stringify(module).includes('entry.js'),
      ),
    );
    assert.ok(store.loader.length >= 2);
    assert.ok(store.chunkGraph.chunks.length >= 2);

    const fetchReport = async (url, options) => {
      const response = await fetch(new URL(url, sdk.server.origin), {
        ...options,
        signal: AbortSignal.timeout(10_000),
      });
      assert.equal(response.status, 200);
      return response;
    };
    const html = await (await fetchReport('/index.html')).text();
    assert.match(html, /<html/);
    const script = html.match(/src="([^"]+\.js)"/);
    assert.ok(script, 'client HTML references a JavaScript asset');
    await fetchReport(script[1]);
    assert.ok((await (await fetchReport('/api/manifest.json')).json()).data);
    const graph = await fetchReport('/api/data/key', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: 'moduleGraph' }),
    });
    assert.match(await graph.text(), /entry\.js/);
  } finally {
    await sdk?.dispose();
    if (compiler) {
      await new Promise((resolve, reject) =>
        compiler.close((error) => (error ? reject(error) : resolve())),
      );
    }
    await plugin.sdk.dispose();
    await rm(root, { recursive: true, force: true });
  }
});
