import type { ecmaVersion as EcmaVersion } from 'acorn';

type Condition = string | RegExp | ((filepath: string) => boolean);
type CheckSyntaxExclude = Condition | Condition[];
type SyntaxErrorKey = 'source' | 'output' | 'reason' | 'code';

export type Config = {
  targets?: string[];
  exclude?: CheckSyntaxExclude;
  excludeOutput?: CheckSyntaxExclude;
  excludeErrorMessage?: RegExp | RegExp[];
  excludeErrorLogs?: SyntaxErrorKey[];
  ecmaVersion?: EcmaVersion;
};
