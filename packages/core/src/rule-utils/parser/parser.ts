import { parseSync, type ParserOptions } from '@swc-next/parser';
import * as walk from './walk';
import { asserts } from './asserts';
import * as utils from './utils';
import type { Node } from './types';

export type ParseOptions = Pick<ParserOptions, 'sourceType'>;

/** Parse JavaScript into ESTree, rejecting recovered syntax errors. */
function parse(input: string, options: ParseOptions = {}): Node.Program {
  const result = parseSync(input, {
    sourceType: options.sourceType ?? 'script',
    lang: 'js',
    preserveParens: false,
    comments: 'none',
    semanticErrors: true,
    // Normalize diagnostics below instead of throwing SWC's diagnostic objects.
    errorRecovery: true,
  });
  const diagnostic = result.diagnostics.find(
    (item) => item.severity === 'error',
  );
  if (diagnostic) {
    throw new SyntaxError(diagnostic.message);
  }
  return result.program as unknown as Node.Program;
}

export const parser = {
  walk,
  parse,
  asserts,
  utils,
};
