import { defineConfig, ts } from '@rslint/core';

export default defineConfig([
  ts.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        project: [
          './packages/*/tsconfig.json',
          './scripts/*/tsconfig.json',
          './scripts/tsconfig/base.json',
          './examples/*/tsconfig.json',
          './e2e/tsconfig.json',
        ],
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]);
