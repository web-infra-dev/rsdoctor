import type { SDK } from '@rsdoctor/shared/types';
import { describe, expect, it } from 'rstack/test';
import {
  getModuleTreeSizes,
  sortModuleTree,
} from 'src/pages/BundleSize/components/module-tree-sort';
import type { DataNode } from 'src/utils/file';

const moduleData = (
  path: string,
  parsedSize: number,
  sourceSize = parsedSize,
): SDK.ModuleData =>
  ({ path, size: { parsedSize, sourceSize } }) as SDK.ModuleData;

const file = (path: string): DataNode => ({
  key: path,
  isLeaf: true,
  __RESOURCEPATH__: path,
});

const directory = (key: string, children: DataNode[]): DataNode => ({
  key,
  title: key,
  __RESOURCEPATH__: key,
  children,
});

const moduleMap = (modules: SDK.ModuleData[]) =>
  new Map(modules.map((mod) => [mod.path.replace(/\\/g, '/'), mod]));

const keys = (nodes: DataNode[]) => nodes.map((node) => node.key);

function freezeTree(nodes: DataNode[]) {
  for (const node of nodes) {
    if (node.children) freezeTree(node.children);
    Object.freeze(node);
  }
  Object.freeze(nodes);
}

describe('BundleSize module tree sizes', () => {
  it('totals every directory from its visible leaves, including plain roots', () => {
    const tree = [
      directory('src', [
        file('src/a.js'),
        directory('src/nested', [file('src/nested/b.js')]),
      ]),
    ];
    const included = moduleMap([
      moduleData('src/a.js', 3, 30),
      moduleData('src/nested/b.js', 7, 70),
      moduleData('src/hidden.js', 100, 1000),
    ]);
    const sizes = getModuleTreeSizes(tree, included, included);

    expect(sizes.get('src')).toEqual({ parsedSize: 10, sourceSize: 100 });
    expect(sizes.get('src/nested')).toEqual({
      parsedSize: 7,
      sourceSize: 70,
    });
    expect(sizes.has('src/hidden.js')).toBe(false);
  });

  it('matches filtered leaf and full-map directory labels for shared paths', () => {
    // createFileStructures keeps one leaf per normalized path. Each map keeps
    // its last matching module, which may differ after applying a filter.
    const tree = [directory('src', [file('src\\same.js')])];
    const first = moduleData('src/same.js', 3, 30);
    const last = moduleData('src\\same.js', 8, 80);
    const included = moduleMap([first, last]);
    const filtered = moduleMap([first]);
    const sizes = getModuleTreeSizes(tree, filtered, included);

    expect(sizes.get('src\\same.js')).toEqual({
      parsedSize: 3,
      sourceSize: 30,
    });
    expect(sizes.get('src')).toEqual({ parsedSize: 8, sourceSize: 80 });
    expect(
      getModuleTreeSizes(tree, included, included).get('src\\same.js'),
    ).toEqual({ parsedSize: 8, sourceSize: 80 });
  });

  it('recalculates directory totals when filtering removes a leaf', () => {
    const included = moduleMap([
      moduleData('src/small.js', 2),
      moduleData('src/large.js', 20),
    ]);
    const filtered = moduleMap([moduleData('src/small.js', 2)]);
    const tree = [directory('src', [file('src/small.js')])];

    expect(getModuleTreeSizes(tree, filtered, included).get('src')).toEqual({
      parsedSize: 2,
      sourceSize: 2,
    });
  });

  it('treats missing modules and empty directories as zero', () => {
    const tree = [file('missing.js'), directory('empty', [])];
    const sizes = getModuleTreeSizes(tree, new Map(), new Map());

    expect(sizes.get('missing.js')).toEqual({ parsedSize: 0, sourceSize: 0 });
    expect(sizes.get('empty')).toEqual({ parsedSize: 0, sourceSize: 0 });
    expect(getModuleTreeSizes([], new Map(), new Map()).size).toBe(0);
  });
});

describe('BundleSize module tree sorting', () => {
  it('sorts root files and aggregated directories, then every nested level', () => {
    const tree = [
      file('standalone.js'),
      directory('src', [
        file('src/small.js'),
        directory('src/nested', [
          file('src/nested/first.js'),
          file('src/nested/second.js'),
        ]),
      ]),
    ];
    const modules = moduleMap([
      moduleData('standalone.js', 10),
      moduleData('src/small.js', 2),
      moduleData('src/nested/first.js', 6),
      moduleData('src/nested/second.js', 7),
    ]);
    const sizes = getModuleTreeSizes(tree, modules, modules);
    const sorted = sortModuleTree(tree, sizes, 'parsedSize');

    expect(keys(sorted)).toEqual(['src', 'standalone.js']);
    expect(keys(sorted[0].children!)).toEqual(['src/nested', 'src/small.js']);
    expect(keys(sorted[0].children![0].children!)).toEqual([
      'src/nested/second.js',
      'src/nested/first.js',
    ]);
  });

  it('sorts bundled and source sizes independently without replacing zero', () => {
    const tree = [file('source-heavy.js'), file('bundle-heavy.js')];
    const modules = moduleMap([
      moduleData('source-heavy.js', 0, 100),
      moduleData('bundle-heavy.js', 10, 0),
    ]);
    const sizes = getModuleTreeSizes(tree, modules, modules);

    expect(keys(sortModuleTree(tree, sizes, 'parsedSize'))).toEqual([
      'bundle-heavy.js',
      'source-heavy.js',
    ]);
    expect(keys(sortModuleTree(tree, sizes, 'sourceSize'))).toEqual([
      'source-heavy.js',
      'bundle-heavy.js',
    ]);
  });

  it('preserves input order for ties and missing size entries', () => {
    const tree = [file('z.js'), file('a.js'), file('zero.js'), file('missing')];
    const modules = moduleMap([
      moduleData('z.js', 5),
      moduleData('a.js', 5),
      moduleData('zero.js', 0),
    ]);
    const sizes = getModuleTreeSizes(tree.slice(0, 3), modules, modules);

    expect(keys(sortModuleTree(tree, sizes, 'parsedSize'))).toEqual([
      'z.js',
      'a.js',
      'zero.js',
      'missing',
    ]);
    expect(sortModuleTree([], sizes, 'parsedSize')).toEqual([]);
  });

  it('leaves the original tree intact so its order can be restored', () => {
    const tree = [directory('src', [file('src/small'), file('src/large')])];
    const modules = moduleMap([
      moduleData('src/small', 1),
      moduleData('src/large', 9),
    ]);
    const sizes = getModuleTreeSizes(tree, modules, modules);
    freezeTree(tree);
    const sorted = sortModuleTree(tree, sizes, 'parsedSize');

    expect(keys(sorted[0].children!)).toEqual(['src/large', 'src/small']);
    expect(keys(tree[0].children!)).toEqual(['src/small', 'src/large']);
    expect(sortModuleTree(tree, sizes, 'original')).toBe(tree);
    expect(sorted[0]).not.toBe(tree[0]);
    expect(sorted[0].children![0]).toBe(tree[0].children![1]);
  });

  it('preserves flattened keys, paths and lazy titles without evaluating them', () => {
    let titleCalls = 0;
    const title = () => {
      titleCalls++;
      return 'src/nested';
    };
    const tree = [
      {
        ...directory('src-src/nested', [file('src/nested/a.js')]),
        title,
        __BASENAME__: 'src/nested',
        __RESOURCEPATH__: 'src/nested',
      },
      { ...file('root.js'), key: 42, title },
    ];
    const modules = moduleMap([
      moduleData('src/nested/a.js', 1),
      moduleData('root.js', 10),
    ]);
    const sizes = getModuleTreeSizes(tree, modules, modules);
    const sorted = sortModuleTree(tree, sizes, 'parsedSize');

    expect(keys(sorted)).toEqual([42, 'src-src/nested']);
    expect(sorted[1].__RESOURCEPATH__).toBe('src/nested');
    expect(sorted[1].__BASENAME__).toBe('src/nested');
    expect(sorted[1].title).toBe(title);
    expect(sorted[0].title).toBe(title);
    expect(sorted[1].children![0]).toBe(tree[0].children![0]);
    expect(titleCalls).toBe(0);
  });
});
