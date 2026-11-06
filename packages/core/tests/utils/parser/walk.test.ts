import { describe, expect, it } from 'rstack/test';
import { parser } from '../../../src/rule-utils/parser';

describe('recursive AST traversal', () => {
  it('descends through unhandled nodes and visits siblings in order', () => {
    const program = parser.parse('first(left); second(right);');
    const names: string[] = [];

    parser.walk.recursive(program, names, {
      Identifier(node, state) {
        state.push(node.name);
      },
    });

    expect(names).toEqual(['first', 'left', 'second', 'right']);
  });

  it('lets visitors select children and pass state without affecting siblings', () => {
    const program = parser.parse('first(left, ignored); second(right);');
    const visits: string[] = [];

    parser.walk.recursive(program, 'root', {
      CallExpression(node, state, visit) {
        visits.push(`${state}:call`);
        visit(node.arguments[0], `${state}:argument`);
      },
      Identifier(node, state) {
        visits.push(`${state}:${node.name}`);
      },
    });

    expect(visits).toEqual([
      'root:call',
      'root:argument:left',
      'root:call',
      'root:argument:right',
    ]);
  });
});
