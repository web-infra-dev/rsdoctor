import path from 'node:path';
import { define } from 'rstack';

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

define.test(async () => {
  const { baseConfig } = await import('../../scripts/test.config.ts');

  return {
    ...baseConfig,
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
      },
    },
  };
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
