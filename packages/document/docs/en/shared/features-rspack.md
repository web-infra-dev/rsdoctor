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
   * turn on it if you just use lite mode. This mode do not have source codes.
   * @default false
   * @deprecated
   */
  lite?: boolean;
}
```
