import { RuleMessage } from './type';

export const code = 'E1008';

export const message: RuleMessage = {
  code,
  title: 'CJS Require Cannot Tree-Shake',
  type: 'markdown',
  category: 'bundle',
  description: `
#### Description

This rule detects \`require()\` calls that use the **CJS Require** dependency type, which prevents tree-shaking of the required module. Unlike \`require('module').property\` (CJS Full Require), a bare \`require('module')\` call forces the entire module to be bundled because the bundler cannot statically determine which exports are used.

#### Common Causes

- Using \`const mod = require('some-module')\` instead of destructuring at the require site.
- Dynamically accessing properties of the required module at runtime rather than statically.

#### General Solution

1. **Use destructured require**: Replace \`const mod = require('A')\` with \`const { foo } = require('A')\` (CJS Full Require) so the bundler can track which exports are used.
2. **Migrate to ESM**: Use \`import { foo } from 'A'\` to enable full tree-shaking support.
3. **Use require with property access**: Replace \`const mod = require('A'); mod.foo()\` with \`const foo = require('A').foo\` to allow partial tree-shaking.
`,
};
