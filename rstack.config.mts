import { define } from 'rstack';

const tsFiles = ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'];

define.lint(({ js, ts }) => [
  {
    ...js.configs.recommended,
    files: tsFiles,
  },
  ...ts.configs.recommended.map((config) => ({
    ...config,
    files: tsFiles,
  })),
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

define.fmt({
  singleQuote: true,
  ignorePatterns: [
    'examples/*/index.html',
    'packages/core/tests/build/utils/bundles/**',
  ],
});
