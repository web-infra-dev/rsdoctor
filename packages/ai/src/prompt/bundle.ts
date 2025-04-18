export const toolDescriptions = {
  getAllChunks: 'get all chunks',
  getChunkById:
    'get chunk by id, if chunk not found, return `Chunk not found`, and stop the execution',
  getModuleById: `get module detail by id：
    - id: the id of the module
    - issuerPath: the dependencies of the module, the issuerPath is a array of module id, the module id is the id of the module that depends on the module.
    - dependencies: the complete dependencies of the module, when user ask the dependencies of the module, 
      please return the dependencies of the module first, not return the allDependencies of the module. 
      But if user ask the detail dependencies of the module, please return the allDependencies of the module.
    - allDependencies: the complete dependencies of the module. 
      when user ask the dependencies of the module, please return the dependencies of the module first, not return the allDependencies of the module. 
    - chunks: an array of chunk identifiers associated with the module.
    - imported: an array of module identifiers on which the module depends.
    - isEntry: indicates if the module is an entry module.
    - size: the size of the module.
    - layer: the layer of the module.
    - modules: connected base subpackage module numbers.
    - rootModule: the root module.
    - webpackId: the module's unique identifier in webpack.
  `,
  getModuleByPath: `get module detail by module name or path, if find multiple modules match the name or path, return all matched modules path, stop execution, and let user select the module path。
    - id: the id of the module
    - issuerPath: the dependencies of the module, the issuerPath is a array of module id, the module id is the id of the module that depends on the module.
    - dependencies: the complete dependencies of the module, when user ask the dependencies of the module, 
      please return the dependencies of the module first, not return the allDependencies of the module. 
      But if user ask the detail dependencies of the module, please return the allDependencies of the module.
    - allDependencies: the complete dependencies of the module. 
      when user ask the dependencies of the module, please return the dependencies of the module first, not return the allDependencies of the module. 
    - chunks: an array of chunk identifiers associated with the module.
    - imported: an array of module identifiers on which the module depends.
    - isEntry: indicates if the module is an entry module.
    - size: the size of the module.
    - layer: the layer of the module.
    - modules: connected base subpackage module numbers.
    - rootModule: the root module.
    - webpackId: the module's unique identifier in webpack.
  `,
  getModuleIssuerPath: `get module issuer path, issuer path is the path of the module that depends on the module.Please draw the returned issuer path as a dependency diagram.
  - The values in the array are module ids, please get the detailed module information based on the module id
  `,
  getPackageInfo: 'get package info',
  getPackageDependency: 'get package dependency',
  getRuleInfo: `get rules info, the rules info is a Record<{id: number, name: string, description: string, severity: string, category: string, module: string, path: string, line: number, column: number, message: string, fix: string}>, where:
  - id: an incremental sequence mark
  - name: the name of the rule
  - description: the description of the rule
  - severity: the severity of the rule
  - category: the category of the rule
  - E1001 Duplicate Packages:
      #### Description

      there is a same name package which bundled more than one version in your application.

      it is not good to the bundle size of your application.

      #### General Solution

      add an entry in \`resolve.alias\` which will configure Webpack to route any package references to a single specified path.

      For example, if \`lodash\` is duplicated in your bundle, the following configuration would render all Lodash imports to always refer to the \`lodash\` instance found at \`./node_modules/lodash\`:

      \`\`\`js
      {
        alias: {
          lodash: path.resolve(__dirname, 'node_modules/lodash')
        }
      }
      \`\`\`
      ,
  - E1002 Cross Chunks Packages:  #### Description
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

  - E1004 ECMA Version Check:
      #### Description
      This rule is used to detect incompatible advanced syntax. When scanning the rule, the configuration of browserslist is prioritized.
  `,
  getSimilarPackages: `get similar packages. Similar packages are categorized as follows, with each line representing a category of similar packages. The presence of packages below does not necessarily mean there are similar packages - replacement should only be considered when packages from the same category exist:
    1. cannot exist simultaneously: lodash、lodash-es、string_decode：Consider migrating to lodash-es for better Tree Shaking support. /n
    2. cannot exist simultaneously: dayjs, moment, date-fns, js-joda. Consider using dayjs to replace moment for smaller bundle size. /n
    3. cannot exist simultaneously: antd, material-ui, semantic-ui-react, material-ui, arco-design /n
    4. cannot exist simultaneously: axios, node-fetch
    5. cannot exist simultaneously: redux, mobx, Zustand, Recoil, Jotai
    6. cannot exist simultaneously: chalk, colors, picocolors, kleur
    7. cannot exist simultaneously: fs-extra, graceful-fs

    It's fine to have any of the above packages in your project, but packages from the same category (i.e. same line) should not coexist.
    If there are no similar packages, just return that there are no similar packages, without listing which packages exist.
    Please provide a simple response without listing all packages.
  `,
};
