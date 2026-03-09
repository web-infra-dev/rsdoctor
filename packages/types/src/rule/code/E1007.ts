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
- Using **import-then-export** patterns in barrel files prevents the bundler from statically analyzing which exports are actually used.

#### Re-export Patterns in Barrel Files

When writing a barrel file that re-exports from multiple modules, the pattern you choose has a significant impact on tree-shaking:

\`\`\`ts
// Method 1: export ... from (recommended)
export { Button, ButtonGroup } from './Button';
export { Input, TextArea } from './Input';

// Method 2: export * from (also fine)
export * from './Button';
export * from './Input';

// Method 3: import then export (NOT recommended — hurts tree-shaking)
import { Button } from './Button';
import { Input } from './Input';
export { Button, Input };
\`\`\`

Methods 1 and 2 are static re-exports that the bundler can tree-shake. Method 3 causes each imported module to be treated as having side effects, preventing tree-shaking even when no exports are consumed.

#### General Solution

1. **Audit import statements**: Make sure you are actually importing and using named exports from this module. Replace bare side-effect imports with explicit named imports when you intend to use the module's exports.
2. **Set \`"sideEffects"\` correctly**: In the module's \`package.json\`, set \`"sideEffects": false\` if the module has no global side effects, so the bundler can safely tree-shake unused exports.
3. **Avoid unintended side-effect imports**: Remove or convert \`import 'module'\` patterns to explicit \`import { foo } from 'module'\` patterns where the exports are needed.
4. **Use static re-exports in barrel files**: Replace import-then-export with \`export { ... } from\` or \`export * from\` to keep re-exports statically analyzable.
`,
};
