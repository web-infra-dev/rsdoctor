export interface ToolResultControls {
  filterPaths: string[];
  page?: number;
  pageSize?: number;
}

interface ParsedControls {
  controls: ToolResultControls;
  passthroughInput: Record<string, unknown>;
}

const CONTROL_KEYS = new Set(['filter', 'page', 'pageSize']);

function parsePositiveInteger(
  value: unknown,
  fieldName: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }

  return parsed;
}

function parseFilterPaths(value: unknown): string[] {
  if (value === undefined) {
    return [];
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  throw new Error('filter must be a string or string array.');
}

function insertProjectionPath(
  root: Record<string, unknown>,
  path: string,
): void {
  const segments = path
    .split('.')
    .map((item) => item.trim())
    .filter(Boolean);
  if (segments.length === 0) {
    return;
  }

  let cursor: Record<string, unknown> = root;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const isLeaf = index === segments.length - 1;

    if (isLeaf) {
      cursor[segment] = true;
      return;
    }

    const existing = cursor[segment];
    if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
      const next: Record<string, unknown> = {};
      cursor[segment] = next;
      cursor = next;
      continue;
    }

    cursor = existing as Record<string, unknown>;
  }
}

function buildProjectionTree(paths: string[]): Record<string, unknown> {
  const tree: Record<string, unknown> = {};
  for (const path of paths) {
    insertProjectionPath(tree, path);
  }
  return tree;
}

function projectValue(
  value: unknown,
  tree: Record<string, unknown> | true,
): unknown {
  if (tree === true) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => projectValue(item, tree));
  }

  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const source = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};

  for (const [key, childTree] of Object.entries(tree)) {
    if (!(key in source)) {
      continue;
    }
    const projected = projectValue(
      source[key],
      childTree as Record<string, unknown> | true,
    );
    if (projected !== undefined) {
      output[key] = projected;
    }
  }

  return output;
}

function paginateUnknownData(
  value: unknown,
  page: number,
  pageSize?: number,
): unknown {
  if (Array.isArray(value)) {
    const actualPageSize = pageSize ?? 100;
    const total = value.length;
    const totalPages = Math.ceil(total / actualPageSize);
    const startIndex = (page - 1) * actualPageSize;
    const endIndex = startIndex + actualPageSize;

    return {
      total,
      pageNumber: page,
      pageSize: actualPageSize,
      totalPages,
      items: value.slice(startIndex, endIndex),
    };
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const record = value as Record<string, unknown>;

  if (Array.isArray(record.items)) {
    const sourceItems = record.items;
    const actualPageSize =
      pageSize ??
      parsePositiveInteger(record.pageSize, 'pageSize') ??
      sourceItems.length;
    const total =
      typeof record.total === 'number' && Number.isFinite(record.total)
        ? record.total
        : sourceItems.length;
    const totalPages = Math.ceil(total / actualPageSize);
    const startIndex = (page - 1) * actualPageSize;
    const endIndex = startIndex + actualPageSize;

    return {
      ...record,
      total,
      pageNumber: page,
      pageSize: actualPageSize,
      totalPages,
      items: sourceItems.slice(startIndex, endIndex),
    };
  }

  if (Array.isArray(record.all)) {
    const sourceItems = record.all;
    const actualPageSize = pageSize ?? 100;
    const total = sourceItems.length;
    const totalPages = Math.ceil(total / actualPageSize);
    const startIndex = (page - 1) * actualPageSize;
    const endIndex = startIndex + actualPageSize;

    return {
      ...record,
      total,
      pageNumber: page,
      pageSize: actualPageSize,
      totalPages,
      all: sourceItems.slice(startIndex, endIndex),
    };
  }

  return record;
}

function applyControlsToPayload(
  payload: unknown,
  controls: ToolResultControls,
): unknown {
  let result = payload;

  if (controls.filterPaths.length > 0) {
    const projectionTree = buildProjectionTree(controls.filterPaths);
    result = projectValue(result, projectionTree);
  }

  if (controls.page !== undefined) {
    result = paginateUnknownData(result, controls.page, controls.pageSize);
  }

  return result;
}

export function splitToolInputControls(
  input: Record<string, unknown>,
): ParsedControls {
  const controls: ToolResultControls = {
    filterPaths: parseFilterPaths(input.filter),
    page: parsePositiveInteger(input.page, 'page'),
    pageSize: parsePositiveInteger(input.pageSize, 'pageSize'),
  };

  const passthroughInput: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (CONTROL_KEYS.has(key)) {
      continue;
    }
    passthroughInput[key] = value;
  }

  return {
    controls,
    passthroughInput,
  };
}

export function applyToolResultControls(
  result: unknown,
  controls: ToolResultControls,
): unknown {
  if (!result || typeof result !== 'object') {
    return applyControlsToPayload(result, controls);
  }

  const response = result as Record<string, unknown>;
  if ('data' in response) {
    return {
      ...response,
      data: applyControlsToPayload(response.data, controls),
    };
  }

  return applyControlsToPayload(result, controls);
}
