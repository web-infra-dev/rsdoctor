import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { rspack, type RuleSetRule } from '@rspack/core';
import { describe, expect, it } from 'rstack/test';
import { RsdoctorRspackPlugin } from '@/rspack-plugin';
import type { Rule } from '@/types/rules';

const cases: {
  name: string;
  createRule: (loader: string) => RuleSetRule | Rule;
  expected: string;
}[] = [
  {
    name: 'rule.loader',
    createRule: (loader) => ({ loader }),
    expected: 'TRANSFORMED_DEFAULT',
  },
  {
    name: 'rule.use with options',
    createRule: (loader) => ({
      use: [{ loader, options: { replacement: 'TRANSFORMED_OPTIONS' } }],
    }),
    expected: 'TRANSFORMED_OPTIONS',
  },
  {
    name: 'legacy rule.loaders strings',
    createRule: (loader) => ({ loaders: [loader] }) satisfies Rule,
    expected: 'TRANSFORMED_DEFAULT',
  },
  {
    name: 'legacy rule.loaders with options in oneOf',
    createRule: (loader) => ({
      oneOf: [
        {
          test: /\.js$/,
          loaders: [
            { loader, options: { replacement: 'TRANSFORMED_OPTIONS' } },
          ],
        } satisfies Rule,
      ],
    }),
    expected: 'TRANSFORMED_OPTIONS',
  },
];

describe('Rspack loader configuration compatibility', () => {
  it.each(cases)(
    'executes and records $name',
    async ({ createRule, expected }) => {
      const root = fs.realpathSync(
        fs.mkdtempSync(
          path.join(os.tmpdir(), 'rsdoctor-loader-compatibility-'),
        ),
      );
      const entry = path.join(root, 'index.js');
      const loader = path.join(root, 'replace-loader.cjs');
      const outputPath = path.join(root, 'dist');
      fs.writeFileSync(entry, "console.log('ORIGINAL_MARKER');");
      fs.writeFileSync(
        loader,
        `module.exports = function(source) {
  const { replacement = 'TRANSFORMED_DEFAULT' } = this.getOptions();
  return source.replace('ORIGINAL_MARKER', replacement);
};`,
      );
      const plugin = new RsdoctorRspackPlugin({
        disableClientServer: true,
        features: ['loader'],
        output: { mode: 'normal' },
      });
      const compiler = rspack({
        context: root,
        mode: 'development',
        devtool: false,
        entry: './index.js',
        output: { path: outputPath, filename: 'main.js' },
        module: { rules: [{ test: /\.js$/, ...createRule(loader) }] },
        plugins: [plugin],
      });

      try {
        await new Promise<void>((resolve, reject) => {
          compiler.run((error, stats) => {
            if (error) reject(error);
            else if (!stats || stats.hasErrors()) {
              reject(
                new Error(
                  stats?.toString({ errors: true }) ?? 'Missing build stats',
                ),
              );
            } else resolve();
          });
        });
        const output = fs.readFileSync(
          path.join(outputPath, 'main.js'),
          'utf8',
        );
        expect(output).toContain(expected);
        expect(output).not.toContain('ORIGINAL_MARKER');
        const resource = plugin.sdk
          .getStoreData()
          .loader.find((item) => item.resource.path === entry);
        const transforms = resource?.loaders.filter(
          (item) => item.path === loader && !item.isPitch,
        );
        expect(transforms).toHaveLength(1);
        expect(transforms?.[0].input).toContain('ORIGINAL_MARKER');
        expect(transforms?.[0].result).toContain(expected);
      } finally {
        try {
          await new Promise<void>((resolve, reject) =>
            compiler.close((error) => (error ? reject(error) : resolve())),
          );
        } finally {
          delete globalThis.__rsdoctor_sdk__;
          delete globalThis.__rsdoctor_sdks__;
          fs.rmSync(root, { recursive: true, force: true });
        }
      }
    },
  );
});
