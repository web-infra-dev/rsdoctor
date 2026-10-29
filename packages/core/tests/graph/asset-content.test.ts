import { describe, expect, it } from 'rstack/test';
import { Asset, ChunkGraph, Chunks } from '@rsdoctor/shared/graph';

function collectContent(path: string, content: string | Buffer) {
  const chunkGraph = new ChunkGraph();
  const asset = new Asset(path, 0, [], '');
  chunkGraph.addAsset(asset);

  Chunks.assetsContents(new Map([[path, { content }]]), chunkGraph, false);

  return asset;
}

describe('asset content collection', () => {
  it('keeps string content', () => {
    const asset = collectContent('index.js', 'console.log(1);');

    expect(asset.content).toBe('console.log(1);');
  });

  it('keeps UTF-8 buffer content', () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><title>é</title></svg>';
    const asset = collectContent('icon.svg', Buffer.from(svg));

    expect(asset.content).toBe(svg);
  });

  it('drops binary buffer content but keeps its size', () => {
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff, 0xfe,
    ]);
    const asset = collectContent('image.png', png);

    expect(asset.content).toBe('');
    expect(asset.size).toBe(png.length);
  });
});
