import { RuleMessage } from './type';

export const code = 'E1002';

export const message: RuleMessage = {
  code,
  title: 'Cross Chunks Packages',
  type: 'markdown',
  category: 'bundle',
  description: `
#### Description

There is a package with the same version that is duplicated across different chunks in your application. This redundancy increases the overall bundle size, which is not optimal for performance.

#### General Solution

To address this issue, you can use Rspack's **SplitChunksPlugin** to extract common dependencies into a separate chunk. This ensures that the same package is not duplicated across multiple chunks, thereby reducing the bundle size.

For example, if **lodash** is being duplicated across different chunks, you can configure the **optimization.splitChunks** option in your Webpack configuration to extract **lodash** into a separate chunk:

\`\`\`
module.exports = {
  optimization: {
    splitChunks: {
      cacheGroups: {
        commons: {
          test: /[\\/]node_modules[\\/]lodash[\\/]/,
          name: 'lodash',
          chunks: 'all',
        },
      },
    },
  },
};
\`\`\`

This configuration will automatically split out common dependencies (including those from \`node_modules\`) into separate chunks, ensuring that no package is duplicated across different chunks.
`,
};
