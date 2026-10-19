import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import test from 'node:test';
import { collectWorkflowDocument } from '@midscene/test';
import { loadTestProject } from '@midscene/test/config';

test('the real Diff case resolves both manifests against any configured fixture origin', async () => {
  const loaded = await loadTestProject(resolve('midscene.config.ts'));
  const project = loaded.projects[0];
  const document = collectWorkflowDocument(
    {
      projectId: project.projectId,
      projectName: project.name,
      absolutePath: resolve('cases/diff.yaml'),
      sourcePath: 'cases/diff.yaml',
    },
    {
      resolveNode: project.nodes.get.bind(project.nodes),
      variables: project.variables,
      env: process.env,
    },
  );
  const path = document.cases[0].definition.steps[0].input.path;
  for (const origin of ['http://127.0.0.1:5000', 'http://localhost:5001']) {
    const page = new URL(path, origin);
    const manifests = page.searchParams.get('__bundle_files__').split(',');
    assert.equal(manifests.length, 2);
    for (const manifest of manifests) {
      const url = new URL(manifest, page);
      assert.equal(url.origin, origin);
      assert.equal(url.pathname, '/api/bundle_diff/manifest.json');
    }
    assert.equal(page.hash, '#/resources/bundle/diff');
  }
});
