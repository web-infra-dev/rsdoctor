import { define } from 'rstack';

define.lint(() => [
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
      },
    },
  },
]);
