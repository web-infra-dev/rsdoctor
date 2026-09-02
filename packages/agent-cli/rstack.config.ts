import path from 'node:path';
import { define } from 'rstack';
import { baseConfig } from '@scripts/config/test';

define.lib({
  source: {
    entry: {
      index: './src/index.ts',
    },
    tsconfigPath: './tsconfig.json',
  },
  output: {
    distPath: {
      root: './dist/',
    },
  },
  bundle: true,
  dts: {
    isolated: true,
  },
  syntax: 'es2021',
});

define.test({
  ...baseConfig,
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
});

define.lint(() => [
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
      },
    },
  },
]);
