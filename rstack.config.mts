import { define } from 'rstack';

define.lint(({ js, ts, globalIgnores }) => [
  globalIgnores(['packages/core/tests/build/utils/bundles/**']),
  js.configs.recommended,
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
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'no-undef': 'off',
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
