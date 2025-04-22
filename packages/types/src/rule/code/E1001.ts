import { RuleMessage } from './type';

export const code = 'E1001';

export const message: RuleMessage = {
  code,
  title: 'Duplicate Packages',
  type: 'markdown',
  category: 'bundle',
  description: `
#### Description

There is a same name package which is bundled in multiple versions in your application.

This negatively impacts the bundle size of your application.

#### General Solution

Add an entry in \`resolve.alias\` to configure Webpack to route any package references to a single specified path.

For example, if \`lodash\` is duplicated in your bundle, the following configuration would make all Lodash imports refer to the \`lodash\` instance found at \`./node_modules/lodash\`:

\`\`\`js
{
  alias: {
    lodash: path.resolve(__dirname, 'node_modules/lodash')
  }
}
\`\`\`
`,
};
