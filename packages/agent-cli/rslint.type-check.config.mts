import { defineConfig } from '@rslint/core';

export default defineConfig([
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
      },
    },
  },
]);
