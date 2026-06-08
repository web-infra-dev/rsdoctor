import { SDK } from '@rsdoctor/types';

export type GraphImportSnippetLabel = {
  file: string;
  code: string;
};

export const truncateLabel = (value: string, maxLength = 26) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;

export const truncateMiddleLabel = (value: string, maxLength: number) => {
  if (value.length <= maxLength) {
    return value;
  }

  const tailLength = Math.floor((maxLength - 1) / 2);
  const headLength = maxLength - tailLength - 1;
  return `${value.slice(0, headLength)}…${value.slice(-tailLength)}`;
};

const normalizeGraphLabelText = (value: string) =>
  value.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();

export const normalizeGraphLabel = (value: string, maxLength: number) =>
  truncateLabel(normalizeGraphLabelText(value), maxLength);

const normalizeFileGraphLabel = (value: string, maxLength: number) =>
  truncateMiddleLabel(normalizeGraphLabelText(value), maxLength);

const stripSnippetLineNumber = (value: string) =>
  value.replace(/^\d+\s*\|\s*/, '').trim();

const buildImportSnippetCode = (item: SDK.ChunkGroupGraphImportData) => {
  const snippetLines =
    item.snippet
      ?.split('\n')
      .map((line) => stripSnippetLineNumber(line.trim()))
      .filter(Boolean) ?? [];
  const importLineIndex = snippetLines.findIndex((line) =>
    line.includes('import('),
  );

  if (importLineIndex >= 0) {
    const requestLineIndex = item.request
      ? snippetLines.findIndex((line, index) => {
          return index >= importLineIndex && line.includes(item.request!);
        })
      : -1;
    const endIndex =
      requestLineIndex >= 0
        ? Math.min(snippetLines.length, requestLineIndex + 2)
        : importLineIndex + 1;

    return snippetLines.slice(importLineIndex, endIndex).join(' ');
  }

  return item.request ? `import(${JSON.stringify(item.request)})` : '';
};

const getSourceFileLabel = (item: SDK.ChunkGroupGraphImportData) => {
  const source = item.sourceModule || item.loc?.replace(/:\d+:\d+$/, '') || '';
  const fileName = source.split(/[\\/]/).filter(Boolean).pop() || source;
  const line = item.loc?.match(/:(\d+):\d+$/)?.[1];

  if (!fileName) {
    return line ? `line ${line}` : 'unknown source';
  }

  return line ? `${fileName}:${line}` : fileName;
};

const getImportSnippetLabel = (
  item: SDK.ChunkGroupGraphImportData,
): GraphImportSnippetLabel | undefined => {
  const code = buildImportSnippetCode(item);

  if (!code) {
    return undefined;
  }

  return {
    file: normalizeFileGraphLabel(getSourceFileLabel(item), 42),
    code: normalizeGraphLabel(code, 72),
  };
};

const formatEdgeImportSnippetLabel = (
  edge: SDK.ChunkGroupGraphEdgeData,
): GraphImportSnippetLabel | undefined => {
  const snippets = edge.imports.map(getImportSnippetLabel).filter(Boolean);
  if (!snippets.length) {
    return undefined;
  }

  const first = snippets[0]!;
  if (edge.imports.length <= 1) {
    return first;
  }

  return {
    file: `${first.file} +${edge.imports.length - 1}`,
    code: first.code,
  };
};

export const getEdgeImportSnippetGraphLabel = (
  edge: SDK.ChunkGroupGraphEdgeData,
): GraphImportSnippetLabel | undefined => {
  const label = formatEdgeImportSnippetLabel(edge);
  if (!label) {
    return undefined;
  }

  return label;
};

export const getPathParentImportSnippetLabels = (
  path: Pick<SDK.ChunkGroupGraphPathData, 'edgeIds'>,
  edgeMap: Map<string, SDK.ChunkGroupGraphEdgeData>,
) => {
  const snippets = new Map<string, GraphImportSnippetLabel>();

  for (const edgeId of path.edgeIds) {
    const edge = edgeMap.get(edgeId);
    if (!edge) {
      continue;
    }

    const snippet = getEdgeImportSnippetGraphLabel(edge);
    if (snippet) {
      snippets.set(edge.from, snippet);
    }
  }

  return snippets;
};
