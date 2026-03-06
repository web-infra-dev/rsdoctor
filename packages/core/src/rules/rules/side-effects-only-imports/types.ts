export interface Config {
  /** Module path patterns to ignore */
  ignore: string[];
  /**
   * Module path patterns to include when the module is under node_modules.
   * Example: ['react', '@babel/runtime']
   */
  include: string[];
}
