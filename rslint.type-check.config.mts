import { defineConfig } from '@rslint/core';

export default defineConfig([
  {
    files: ['packages/agent-cli/src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: ['./packages/agent-cli/tsconfig.json'],
      },
    },
  },
]);
