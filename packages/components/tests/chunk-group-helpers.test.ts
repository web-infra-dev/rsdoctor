import { describe, expect, it } from '@rstest/core';
import { SDK } from '@rsdoctor/types';
import { getPathParentImportSnippetLabels } from '../src/pages/BundleSize/components/chunk-group-helpers';

const createEdge = (
  from: string,
  to: string,
  request: string,
  sourceModule: string,
): SDK.ChunkGroupGraphEdgeData => ({
  id: `${from}->${to}`,
  from,
  to,
  fromName: from,
  toName: to,
  imports: [
    {
      request,
      sourceModule,
      loc: `${sourceModule}:1:0`,
      snippet: `1 | import(${JSON.stringify(request)})`,
    },
  ],
});

describe('getPathParentImportSnippetLabels', () => {
  it('attaches each import snippet to the parent node that performs the import', () => {
    const mainToFoo = createEdge('main', 'foo', './foo', 'entry.js');
    const fooToBar = createEdge('foo', 'bar', './bar', 'foo.js');
    const snippets = getPathParentImportSnippetLabels(
      {
        edgeIds: [mainToFoo.id, fooToBar.id],
      },
      new Map([
        [mainToFoo.id, mainToFoo],
        [fooToBar.id, fooToBar],
      ]),
    );

    expect(snippets.get('main')).toMatchObject({
      file: 'entry.js:1',
      code: 'import("./foo")',
    });
    expect(snippets.get('foo')).toMatchObject({
      file: 'foo.js:1',
      code: 'import("./bar")',
    });
    expect(snippets.has('bar')).toBe(false);
  });
});
