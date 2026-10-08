import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { rspack, type Configuration, type Stats } from '@rspack/core';
import { describe, expect, it } from 'rstack/test';
import { parseBundle } from '@/build-utils/build/utils/parseBundle';

const cases: { name: string; config: Configuration }[] = [
  { name: 'Web development', config: { target: 'web' } },
  {
    name: 'Web production',
    config: {
      target: 'web',
      mode: 'production',
      optimization: { minimize: true },
    },
  },
  {
    name: 'Web Worker',
    config: {
      target: 'webworker',
      output: { chunkFormat: 'array-push', chunkLoading: 'import-scripts' },
    },
  },
  {
    name: 'Node CommonJS',
    config: {
      target: 'node',
      output: { chunkFormat: 'commonjs', chunkLoading: 'require' },
    },
  },
];

describe('parseBundle with Rspack output', () => {
  it.each(cases)(
    'extracts main and async modules from $name',
    async ({ config }) => {
      const root = fs.realpathSync(
        fs.mkdtempSync(path.join(os.tmpdir(), 'rsdoctor-parse-bundle-')),
      );
      const outputPath = path.join(root, 'dist');
      const markers: Record<string, string> = {
        'index.js': 'ENTRY_MARKER',
        'sync.js': 'SYNC_MARKER',
        'async.js': 'ASYNC_MARKER',
      };
      fs.writeFileSync(
        path.join(root, 'index.js'),
        `console.log('ENTRY_MARKER', require('./sync.js'));
import('./async.js').then(console.log);`,
      );
      fs.writeFileSync(
        path.join(root, 'sync.js'),
        "module.exports = 'SYNC_MARKER';",
      );
      fs.writeFileSync(
        path.join(root, 'async.js'),
        "module.exports = 'ASYNC_MARKER';",
      );
      const compiler = rspack({
        context: root,
        mode: 'development',
        devtool: false,
        entry: './index.js',
        ...config,
        output: {
          path: outputPath,
          filename: 'main.js',
          chunkFilename: '[id].js',
          module: false,
          iife: true,
          chunkLoadingGlobal: 'rsdoctorTestChunks',
          ...config.output,
        },
        optimization: {
          concatenateModules: false,
          minimize: false,
          ...config.optimization,
        },
      });

      try {
        const stats = await new Promise<Stats>((resolve, reject) => {
          compiler.run((error, result) => {
            if (error) reject(error);
            else if (!result || result.hasErrors()) {
              reject(
                new Error(
                  result?.toString({ errors: true }) ?? 'Missing build stats',
                ),
              );
            } else resolve(result);
          });
        });
        const json = stats.toJson({
          all: false,
          chunks: true,
          modules: true,
          ids: true,
        });
        const modules = (json.modules ?? []).filter(
          (module) => module.id != null && module.identifier,
        );
        const moduleIds = modules.map((module) => ({
          renderId: String(module.id),
          identifier: module.identifier!,
        }));
        expect(modules).toHaveLength(3);
        expect(json.chunks).toHaveLength(2);
        expect(json.chunks?.filter((chunk) => chunk.initial)).toHaveLength(1);

        for (const chunk of json.chunks!) {
          const expectedModules = modules.filter((module) =>
            module.chunks?.includes(chunk.id!),
          );
          expect(expectedModules).toHaveLength(chunk.initial ? 2 : 1);
          expect(chunk.files).toHaveLength(1);
          const bundlePath = path.join(outputPath, chunk.files![0]);
          const bundle = parseBundle(bundlePath, moduleIds);
          const parsedModules = bundle.modules ?? {};
          expect(bundle.src).toBe(fs.readFileSync(bundlePath, 'utf8'));
          expect(Object.keys(parsedModules).sort()).toEqual(
            expectedModules.map((module) => module.identifier!).sort(),
          );
          for (const module of expectedModules) {
            const parsed = parsedModules[module.identifier!];
            const marker = markers[path.basename(module.identifier!)];
            expect(marker).toBeDefined();
            expect(parsed.content).toContain(marker);
            expect(parsed.size).toBe(Buffer.byteLength(parsed.content));
            expect(bundle.runtimeSrc).not.toContain(marker);
          }
        }
      } finally {
        try {
          await new Promise<void>((resolve, reject) =>
            compiler.close((error) => (error ? reject(error) : resolve())),
          );
        } finally {
          fs.rmSync(root, { recursive: true, force: true });
        }
      }
    },
  );
});
