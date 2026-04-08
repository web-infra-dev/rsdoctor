export interface Config {
  /**
   * Module path patterns to ignore (applied to both issuer and required module paths).
   * Defaults to ['node_modules'].
   */
  ignore: string[];
}
