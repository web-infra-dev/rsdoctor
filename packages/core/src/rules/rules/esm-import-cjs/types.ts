export interface Config {
  /**
   * Package name patterns to ignore (substring match against the import request).
   * @example ['my-legacy-pkg', '@internal/']
   * @default []
   */
  ignore: string[];
}
