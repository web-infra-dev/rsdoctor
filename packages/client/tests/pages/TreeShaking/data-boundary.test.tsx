import { describe, expect, it } from 'rstack/test';
import React from 'react';
import { Module, ModuleGraph, ModuleGraphModule } from '@rsdoctor/shared/graph';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { TreeShakingDataBoundary } from 'src/pages/TreeShaking/data-boundary';

function render(graph: ModuleGraph, supported: boolean) {
  function Analysis() {
    if (!supported)
      throw new Error('Analysis must not render without export data');
    return <span>Export analysis</span>;
  }
  return renderToStaticMarkup(
    <MemoryRouter>
      <TreeShakingDataBoundary moduleGraph={graph}>
        <Analysis />
      </TreeShakingDataBoundary>
    </MemoryRouter>,
  );
}

describe('Tree Shaking report data boundary', () => {
  it('handles an empty report without mounting analysis', () => {
    expect(render(new ModuleGraph(), false)).toContain(
      'does not contain the export analysis data',
    );
  });

  it('handles native modules without legacy export records', () => {
    const graph = new ModuleGraph();
    graph.addModule(new Module('entry', '/entry.js'));
    const html = render(graph, false);
    expect(html).toContain('does not contain the export analysis data');
    expect(html).toContain('href="/bundle/size"');
  });

  it('handles partially populated export records', () => {
    const graph = new ModuleGraph();
    const entry = new Module('entry', '/entry.js');
    graph.addModule(entry, new Module('dependency', '/dependency.js'));
    graph.addModuleGraphModule(new ModuleGraphModule(entry, graph));
    expect(render(graph, false)).toContain(
      'does not contain the export analysis data',
    );
  });

  it('preserves legacy reports even when their export lists are empty', () => {
    const graph = new ModuleGraph();
    const entry = new Module('entry', '/entry.js');
    graph.addModule(entry);
    graph.addModuleGraphModule(new ModuleGraphModule(entry, graph));
    expect(render(graph, true)).toContain('Export analysis');
  });
});
