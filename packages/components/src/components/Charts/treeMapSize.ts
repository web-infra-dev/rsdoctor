export type TreeMapSizeType = 'stat' | 'parsed' | 'gzip' | 'value';

export interface TreeMapSizeNode {
  value?: number;
  children?: TreeMapSizeNode[];
  sourceSize?: number;
  bundledSize?: number;
  gzipSize?: number;
}

function getOwnSize(node: TreeMapSizeNode, sizeType: TreeMapSizeType) {
  if (sizeType === 'stat') return node.sourceSize ?? 0;
  if (sizeType === 'parsed') return node.bundledSize ?? 0;
  if (sizeType === 'gzip') return node.gzipSize ?? 0;
  return node.value ?? 0;
}

export function calculateTreeNodeTotalSize(
  node: TreeMapSizeNode,
  sizeType: TreeMapSizeType,
): number {
  const ownSize = getOwnSize(node, sizeType);
  if (ownSize > 0 || !node.children?.length) {
    return ownSize;
  }

  return node.children.reduce(
    (total, child) => total + calculateTreeNodeTotalSize(child, sizeType),
    0,
  );
}

export function calculateTreeNodesTotalSize(
  nodes: TreeMapSizeNode[],
  sizeType: TreeMapSizeType,
): number {
  return nodes.reduce(
    (total, node) => total + calculateTreeNodeTotalSize(node, sizeType),
    0,
  );
}
