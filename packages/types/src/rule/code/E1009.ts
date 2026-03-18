import { RuleMessage } from './type';

export const code = 'E1009';

export const message: RuleMessage = {
  code,
  title: 'ESM Import Resolved to CJS',
  type: 'markdown',
  category: 'bundle',
  description: `
#### Description

This rule detects cases where a package provides both **ESM** and **CJS** formats (via the \`module\` field or \`exports["."]["import"]\` in \`package.json\`), but the bundler resolved the ESM \`import\` statement to the **CJS** entry instead.

This prevents tree-shaking of the package, leading to larger bundle sizes than necessary.

#### Common Causes

- The bundler's \`resolve.mainFields\` does not include \`module\`, so it falls back to \`main\` (CJS).
- The \`resolve.conditionNames\` does not include \`import\`, so \`exports\` conditions are resolved as \`require\`.
- The package uses \`exports\` field but the bundler version does not support conditional exports.

#### General Solution

1. **Add \`module\` to \`resolve.mainFields\`**: Ensure your bundler config includes \`"module"\` before \`"main"\`.
2. **Add \`import\` to \`resolve.conditionNames\`**: For packages using the \`exports\` field, ensure the \`import\` condition is listed.
3. **Check bundler version**: Older versions of webpack/rspack may not support \`exports\` conditional resolution. Upgrade if necessary.
`,
};
