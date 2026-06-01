import { describe, expect, it } from '@rstest/core';
import { parser } from '../../src/rule-utils/parser';

describe('test src/rule-utils/parser/parser.ts', () => {
  it('parses import attributes without an extra acorn plugin', () => {
    const ast = parser.internal.parse(
      `import data from './data.json' with { type: 'json' };`,
      {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    );

    expect(ast.body[0].type).toBe('ImportDeclaration');
  });

  describe('extend', () => {
    it('extend nothing', () => {
      const parser1 = parser.extend();
      const parser2 = parser.extend();

      expect(parser1 === parser2).toBeTruthy();
    });

    it('extend acorn plugin', () => {
      const parser1 = parser.extend();
      const parser2 = parser.extend((P) => class A extends P {});

      expect(parser1 === parser2).toBeFalsy();
      expect(parser.extend() === parser1).toBeFalsy();
      expect(parser.extend() === parser2).toBeTruthy();
    });
  });
});
