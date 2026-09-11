import { describe, expect, it } from 'rstack/test';
import { Module } from '@rsdoctor/shared/graph';
import {
  getSideEffectModules,
  getSideEffectTree,
} from 'src/pages/TreeShaking/side-effects-data';

function fixture() {
  const first = new Module('main', '/project/entry.js').toData();
  const second = { ...first, id: first.id + 1, layer: 'background' };
  const code = {
    moduleId: second.id,
    code: 'console.log("effect")',
    startLine: 1,
  };
  return {
    modules: [first, second],
    data: { sideEffectCodes: { [second.id]: [code] } },
  };
}

describe('native Tree Shaking data', () => {
  it('joins by module ID across layers and ignores empty or orphan records', () => {
    const { modules, data } = fixture();
    data.sideEffectCodes[modules[0].id] = [];
    data.sideEffectCodes[99999] = data.sideEffectCodes[modules[1].id];
    expect(getSideEffectModules(modules, data)).toEqual([modules[1]]);
  });

  it.each([undefined, { sideEffectCodes: {} }])(
    'handles missing or empty data: %j',
    (data) => {
      expect(getSideEffectModules(fixture().modules, data)).toEqual([]);
    },
  );

  it.each([
    ['ENTRY', true],
    ['/project/', true],
    ['missing', false],
  ] as const)('filters by path keyword %s', (search, matches) => {
    const { modules, data } = fixture();
    expect(getSideEffectModules(modules, data, search)).toEqual(
      matches ? [modules[1]] : [],
    );
  });
});

describe('side effect file tree', () => {
  it('keeps the same file in different layers independently selectable', () => {
    const { modules } = fixture();
    const tree = getSideEffectTree(modules, '/project');
    expect(tree.map((node) => node.title)).toEqual(['Modules', 'background']);
    expect(tree[0].children?.[0].key).toBe(`module:${modules[0].id}`);
    expect(tree[1].children?.[0].key).toBe(`module:${modules[1].id}`);
  });

  it('groups shared directories and leaves folders unselectable', () => {
    const { modules } = fixture();
    const tree = getSideEffectTree(
      modules.map((module, index) => ({
        ...module,
        path: `/project/src/file${index}.js`,
        layer: 'main',
      })),
      '/project',
    );
    const directory = tree[0].children?.[0];
    expect(directory?.title).toBe('src');
    expect(directory?.selectable).toBe(false);
    expect(directory?.children).toHaveLength(2);
  });

  it('normalizes Windows paths before creating relative tree entries', () => {
    const { modules } = fixture();
    const tree = getSideEffectTree(
      modules.map((module) => ({
        ...module,
        path: 'C:\\project\\src\\entry.js',
        layer: 'main',
      })),
      'C:\\project',
    );

    expect(tree[0].children?.[0].title).toBe('src');
    expect(tree[0].children?.[0].children?.[0].title).toBe('entry.js');
  });
});
