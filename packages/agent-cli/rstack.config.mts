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

define.lint(() => [
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
      },
    },
  },
]);
