import { describe, expect, it } from 'rstack/test';
import { parser, type Node } from '../../../src/rule-utils/parser';

describe('SWC parser', () => {
  it('preserves UTF-16 module offsets and unwraps parentheses for bundle traversal', () => {
    const source =
      '/* 😀 中文 */ (() => { var modules = { 1: function() {} }; })();';
    const program = parser.parse(source);
    const statement = program.body[0] as Node.ExpressionStatement;
    expect(statement.expression.type).toBe('CallExpression');
    const functions: string[] = [];
    parser.walk.recursive(program, undefined, {
      FunctionExpression(node) {
        functions.push(source.slice(node.start, node.end));
      },
    });
    expect(functions).toEqual(['function() {}']);
    expect(source.slice(statement.start, statement.end)).toBe(
      '(() => { var modules = { 1: function() {} }; })();',
    );
  });

  it('parses default export comparison expressions', () => {
    const program = parser.parse('exports.default; module.exports.default;');
    const expressions = program.body as Node.ExpressionStatement[];
    expect(expressions.map((node) => node.expression.type)).toEqual([
      'MemberExpression',
      'MemberExpression',
    ]);
    expect(
      parser.utils.isSameSyntax(
        expressions[0].expression,
        expressions[1].expression,
      ),
    ).toBe(false);
  });

  it('compares SWC member expressions with existing ESTree nodes', () => {
    const statement = parser.parse('exports.default;')
      .body[0] as Node.ExpressionStatement;
    const existingNode = {
      type: 'MemberExpression',
      computed: false,
      object: { type: 'Identifier', name: 'exports' },
      property: { type: 'Identifier', name: 'default' },
    } as Node.MemberExpression;

    expect(parser.utils.isSameSyntax(statement.expression, existingNode)).toBe(
      true,
    );
  });

  it('supports import attributes in module mode', () => {
    const program = parser.parse(
      'import data from "./data.json" with { type: "json" };',
      {
        sourceType: 'module',
      },
    );
    expect(program.body[0].type).toBe('ImportDeclaration');
  });

  it('rejects syntax errors and semantic early errors', () => {
    expect(() => parser.parse('const = ;')).toThrow(SyntaxError);
    expect(() => parser.parse('let value; let value;')).toThrow(SyntaxError);
    expect(() => parser.parse('import value from "value";')).toThrow(
      SyntaxError,
    );
  });
});
