import { RuleMessage } from './type';

export const code = 'E1007';

export const message: RuleMessage = {
  code,
  title: 'Tree Shaking Side Effects Only',
  type: 'markdown',
  category: 'bundle',
  description: `
#### Description

This rule detects modules that are pulled in and bundled solely due to side effects. This is often caused by unintended tree-shaking failures (e.g. missing or incorrect \`"sideEffects"\` field in \`package.json\`, or non-tree-shakeable import patterns), resulting in the entire module being bundled even though none of its exports are used.

#### Common Causes

- The package's \`package.json\` is missing \`"sideEffects": false\` (or incorrectly set to \`true\`), preventing the bundler from pruning unused exports.
- An import statement like \`import 'some-module'\` or \`import './styles.css'\` is being treated as a side-effect-only import, but the intended use was to consume exports.
- Barrel files (index files that re-export many things) cause the whole module to be kept alive when only a side-effect import is present.

#### General Solution

1. **Audit import statements**: Make sure you are actually importing and using named exports from this module. Replace bare side-effect imports with explicit named imports when you intend to use the module's exports.
2. **Set \`"sideEffects"\` correctly**: In the module's \`package.json\`, set \`"sideEffects": false\` if the module has no global side effects, so the bundler can safely tree-shake unused exports.
3. **Avoid unintended side-effect imports**: Remove or convert \`import 'module'\` patterns to explicit \`import { foo } from 'module'\` patterns where the exports are needed.
`,
};
