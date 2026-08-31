import { define } from 'rstack';
import skillsLock from './skills-lock.json' with { type: 'json' };

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
  sortPackageJson: true,
  ignorePatterns: [
    'examples/*/index.html',
    'packages/core/tests/build/utils/bundles/**',
    // Ignore installed Skills because their formatting may differ from this repository.
    ...Object.keys(skillsLock.skills).map((name) => `.agents/skills/${name}`),
  ],
  plugins: ['heading-case'],
});

define.staged({
  '*.{md,mdx,json,css,less,scss}': 'rs fmt',
  '*.{js,jsx,ts,tsx,mjs,cjs}': ['rs lint', 'rs fmt'],
  'package.json': 'pnpm run check-dependency-version',
});
