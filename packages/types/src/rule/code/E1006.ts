import { RuleMessage } from './type';

export const code = 'E1006';

export const message: RuleMessage = {
  code,
  title: 'Module Mixed Chunks',
  type: 'markdown',
  category: 'bundle',
  description: `
#### Description

When a module is included in both initial chunks and async chunks, it can lead to code duplication. This happens when the same module code is bundled into multiple chunks, increasing the overall bundle size.

#### General Solution

1. Use code splitting optimization to ensure modules are only included in appropriate chunks.
2. Review your dynamic import statements and ensure they're not causing modules to be included in both initial and async chunks.
3. Consider using webpack's splitChunks configuration to better control chunk splitting.

For example, if a module is used both synchronously and asynchronously, consider:
- Refactoring to use only one import method
- Using webpack's optimization.splitChunks to extract common code
- Reviewing the module's dependencies to understand why it's being included in multiple chunks
`,
};
