# @rsdoctor/rules-example

Example dynamic rules package for rsdoctor.

## Installation

```bash
npm install @rsdoctor/rules-example
# or
pnpm add @rsdoctor/rules-example
# or
yarn add @rsdoctor/rules-example
```

## Usage

### With Rsbuild

```ts
// rsbuild.config.ts
import { RsdoctorRspackPlugin } from '@rsdoctor/rspack-plugin';

export default {
  plugins: [
    new RsdoctorRspackPlugin({
      linter: {
        level: 'Error',
        dynamicRules: {
          packages: [
            {
              package: '@rsdoctor/rules-example',
              version: '^1.0.0',
              enabled: true,
              rules: {
                'bundle-size-limit': ['on', { maxSize: 2 * 1024 * 1024 }], // 2MB
                'unused-dependencies': 'warn',
              },
            },
          ],
        },
      },
    }),
  ],
};
```

### With Webpack

```ts
// webpack.config.ts
import { RsdoctorWebpackPlugin } from '@rsdoctor/webpack-plugin';

export default {
  plugins: [
    new RsdoctorWebpackPlugin({
      linter: {
        level: 'Error',
        dynamicRules: {
          packages: [
            {
              package: '@rsdoctor/rules-example',
              version: '^1.0.0',
              enabled: true,
              rules: {
                'bundle-size-limit': ['on', { maxSize: 2 * 1024 * 1024 }], // 2MB
                'unused-dependencies': 'warn',
              },
            },
          ],
        },
      },
    }),
  ],
};
```

## Rules

### bundle-size-limit

Checks if the total bundle size exceeds a specified limit.

**Configuration:**

- `maxSize` (number): Maximum bundle size in bytes (default: 1MB)

### unused-dependencies

Detects potentially unused dependencies in the bundle.

**Configuration:**

- `ignorePatterns` (string[]): Patterns to ignore when checking for unused dependencies (default: `['@types/*', '*.d.ts']`)

## Creating Your Own Rules Package

1. Create a new npm package with the following structure:

```
your-rules-package/
├── package.json
├── index.js
└── README.md
```

2. Define your rules using `defineRule`:

```js
import { defineRule } from '@rsdoctor/core/rules';

const MyCustomRule = defineRule(() => ({
  meta: {
    category: 'bundle',
    severity: 'Warn',
    title: 'my-custom-rule',
    defaultConfig: {
      // your default config
    },
  },
  check({ chunkGraph, report, ruleConfig }) {
    // your rule logic
  },
}));

export const rules = [MyCustomRule];
```

3. Publish your package to npm

4. Use it in your rsdoctor configuration:

```ts
dynamicRules: {
  packages: [
    {
      package: 'your-rules-package',
      version: '^1.0.0',
      rules: {
        'my-custom-rule': ['on', { /* your config */ }],
      },
    },
  ],
}
```
