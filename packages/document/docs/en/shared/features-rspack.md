```ts
interface RsdoctorRspackPluginFeatures {
  /**
   * turn off it if you need not to analyze the executions of Rspack loaders.
   * @default true
   */
  loader?: boolean;
  /**
   * turn off it if you need not to analyze the executions of Rspack plugins.
   * @default true
   */
  plugins?: boolean;
  /**
   * turn on it if you need to analyze resolver executions.
   * @default false
   */
  resolver?: boolean;
  /**
   * turn off it if you need not to analyze the output bundle.
   * @default true
   */
  bundle?: boolean;
  /**
   * turn on it if you need to analyze the tree shaking result.
   * @default false
   */
  treeShaking?: boolean;
  /**
   * Enable this if you only use lite mode. Source code is not included.
   * @default false
   */
  lite?: boolean;
}
```
