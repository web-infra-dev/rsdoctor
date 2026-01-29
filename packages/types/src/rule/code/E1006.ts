import { RuleMessage } from './type';

export const code = 'E1006';

export const message: RuleMessage = {
  code,
  title: 'Module Mixed Chunks',
  type: 'markdown',
  category: 'bundle',
  description: `
#### Description

When a module is included in both **initial chunks** and **async chunks**, the same module code is bundled into multiple chunks, increasing output size and potentially affecting first-screen load and cache efficiency.

- **Initial chunks**: Chunks loaded with the main entry (e.g. entry points, synchronous \`import\` in the main bundle).
- **Async chunks**: Chunks loaded on demand via dynamic \`import()\` or similar.

In the **Module Mixed Chunks** tab of Bundle Alerts, each entry shows the module path, **Initial Chunks** list, and **Async Chunks** list so you can locate duplicated modules.

#### Common Causes

- **Same module referenced in two ways**: The module is both synchronously imported in the main bundle or entry and dynamically \`import()\`ed elsewhere, so the bundler emits it in both initial and async chunks.
- **A file is both an entry and an async chunk**: e.g. a utility module is configured as an entry and also \`import()\`ed in app code, so it appears in the entry's initial chunk and in a dynamically loaded async chunk.
- **splitChunks overlapping with entry**: A path is split into an async chunk via \`splitChunks\` / \`chunkSplit\`, but that path is also an entry or a main-bundle dependency, leading to mixed chunk types.

#### General Solution

1. **Use a single import style**: Prefer one way to reference a module—either all synchronous imports (initial) or all dynamic \`import()\` (async). Avoid the same file being both synchronously imported in the main bundle and dynamically imported elsewhere.
2. **Review entry vs dynamic loading**: If a file is both an entry and part of an async chunk, remove one of those usages or extract it into a single shared chunk via build config so both initial and async chunks reference it instead of duplicating it.
3. **Adjust splitChunks**: Check rules for that module path in \`optimization.splitChunks\` (Rspack/Webpack) or \`performance.chunkSplit\` (Rsbuild), and avoid the same module being split into both initial and async chunks. Use \`chunks: 'async'\` or \`chunks: 'initial'\` where appropriate, or control which chunk type it goes into via \`cacheGroups\` and \`test\` / \`chunks\`.
4. **Trace dependencies**: From the reported module path and chunk list, search the codebase for references to that module, distinguish sync vs dynamic imports, then converge to a single chunk type or extract a common chunk.
`,
};
