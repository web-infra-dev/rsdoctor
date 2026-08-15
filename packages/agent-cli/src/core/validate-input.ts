import type { JsonSchema } from './types';

/**
 * Tool input validation.
 *
 * The supported schema dialect covers the shared controls and `OptionDef`
 * properties emitted by the tool catalog: an object schema carrying
 * `properties`, an optional `required` list, `additionalProperties`, and
 * per-property `type` (a single name or a list of names), `enum`, `minimum`,
 * and `maximum`. `items` is handled as well so array properties declared by
 * hand-written `ToolDefinition`s are checked too.
 *
 * Two deliberate choices keep the executor from being stricter than the CLI it
 * mirrors:
 *
 * - Unknown keywords are ignored instead of rejected, so a richer schema never
 *   fails closed.
 * - Extra properties are accepted unless a schema explicitly declares
 *   `additionalProperties: false`. Catalog schemas are strict so misspelled
 *   programmatic inputs are rejected before dispatch.
 */
export interface ToolInputValidationIssue {
  /** Dotted path to the offending value, empty for the input object itself. */
  path: string;
  message: string;
}

/**
 * Thrown before dispatch when a tool input does not match the tool's declared
 * `inputSchema`. Throwing matches how the executor already reports pre-dispatch
 * failures (unknown tool, unparsable control values), so the CLI keeps wrapping
 * it in the usual `{ ok: false, error }` envelope, while `issues` exposes the
 * structured detail.
 */
export class ToolInputValidationError extends Error {
  readonly toolName: string;
  readonly issues: ToolInputValidationIssue[];

  constructor(toolName: string, issues: ToolInputValidationIssue[]) {
    super(
      `Invalid input for rsdoctor tool ${toolName}: ${issues
        .map((issue) => issue.message)
        .join('; ')}`,
    );
    this.name = 'ToolInputValidationError';
    this.toolName = toolName;
    this.issues = issues;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function matchesSchemaType(value: unknown, type: unknown): boolean {
  if (Array.isArray(type)) {
    return type.some((entry) => matchesSchemaType(value, entry));
  }

  switch (type) {
    case 'array':
      return Array.isArray(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'integer': {
      const parsed = parseFiniteNumber(value);
      return parsed !== undefined && Number.isInteger(parsed);
    }
    case 'null':
      return value === null;
    case 'number':
      return parseFiniteNumber(value) !== undefined;
    case 'object':
      return isRecord(value);
    case 'string':
      return typeof value === 'string';
    default:
      return true;
  }
}

function describeSchemaType(type: unknown): string {
  return Array.isArray(type) ? type.map(String).join(' or ') : String(type);
}

function describeValueType(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  return typeof value;
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (value !== null && typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function jsonValuesEqual(
  left: unknown,
  right: unknown,
  seen = new WeakMap<object, object>(),
): boolean {
  if (left === right) {
    return true;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) {
      return false;
    }
    const previous = seen.get(left);
    if (previous !== undefined) {
      return previous === right;
    }
    seen.set(left, right);
    return (
      left.length === right.length &&
      left.every((entry, index) => jsonValuesEqual(entry, right[index], seen))
    );
  }

  if (!isRecord(left) || !isRecord(right)) {
    return false;
  }
  const previous = seen.get(left);
  if (previous !== undefined) {
    return previous === right;
  }
  seen.set(left, right);
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(right, key) &&
        jsonValuesEqual(left[key], right[key], seen),
    )
  );
}

function schemaHasNumericType(type: unknown): boolean {
  return Array.isArray(type)
    ? type.includes('integer') || type.includes('number')
    : type === 'integer' || type === 'number';
}

function describeLabel(path: string): string {
  return path === '' ? 'input' : `"${path}"`;
}

function joinPath(path: string, key: string): string {
  return path === '' ? key : `${path}.${key}`;
}

function collectIssues(
  value: unknown,
  schema: unknown,
  path: string,
  issues: ToolInputValidationIssue[],
  options: ToolInputValidationOptions,
): void {
  if (!isRecord(schema)) {
    return;
  }

  const label = describeLabel(path);

  if (schema.type !== undefined && !matchesSchemaType(value, schema.type)) {
    issues.push({
      path,
      message: `${label} must be of type ${describeSchemaType(
        schema.type,
      )}, received ${describeValueType(value)}`,
    });
    return;
  }

  const numericValue =
    typeof value === 'number' || schemaHasNumericType(schema.type)
      ? parseFiniteNumber(value)
      : undefined;
  if (
    Array.isArray(schema.enum) &&
    !schema.enum.some(
      (entry) =>
        jsonValuesEqual(entry, value) ||
        (numericValue !== undefined && jsonValuesEqual(entry, numericValue)),
    )
  ) {
    issues.push({
      path,
      message: `${label} must be one of ${schema.enum
        .map(formatValue)
        .join(', ')}, received ${formatValue(value)}`,
    });
  }

  if (numericValue !== undefined) {
    if (typeof schema.minimum === 'number' && numericValue < schema.minimum) {
      issues.push({
        path,
        message: `${label} must be >= ${schema.minimum}, received ${formatValue(value)}`,
      });
    }
    if (typeof schema.maximum === 'number' && numericValue > schema.maximum) {
      issues.push({
        path,
        message: `${label} must be <= ${schema.maximum}, received ${formatValue(value)}`,
      });
    }
  }

  if (Array.isArray(value)) {
    if (isRecord(schema.items)) {
      value.forEach((entry, index) => {
        collectIssues(
          entry,
          schema.items,
          `${path}[${index}]`,
          issues,
          options,
        );
      });
    }
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  const properties = isRecord(schema.properties) ? schema.properties : {};

  if (Array.isArray(schema.required)) {
    for (const key of schema.required) {
      if (
        typeof key === 'string' &&
        (!(key in value) || value[key] === undefined)
      ) {
        issues.push({
          path: joinPath(path, key),
          message: `${label} is missing required property "${key}"`,
        });
      }
    }
  }

  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined) {
      continue;
    }
    const propertyPath = joinPath(path, key);
    const propertySchema = properties[key];

    if (propertySchema !== undefined) {
      collectIssues(entry, propertySchema, propertyPath, issues, options);
      continue;
    }

    const isAllowedExecutorProperty =
      path === '' && options.allowedAdditionalProperties?.has(key) === true;
    if (schema.additionalProperties === false && !isAllowedExecutorProperty) {
      issues.push({
        path: propertyPath,
        message: `${describeLabel(propertyPath)} is not an allowed property`,
      });
      continue;
    }

    if (isRecord(schema.additionalProperties)) {
      collectIssues(
        entry,
        schema.additionalProperties,
        propertyPath,
        issues,
        options,
      );
    }
  }
}

export interface ToolInputValidationOptions {
  /** Executor-level properties accepted in addition to a strict tool schema. */
  allowedAdditionalProperties?: ReadonlySet<string>;
}

/**
 * Validates `input` against a tool's declared `inputSchema` and throws a
 * {@link ToolInputValidationError} listing every mismatch.
 *
 * `undefined` (or any non-object) input is reported as a type mismatch rather
 * than defaulted to `{}`: `ToolExecutionRequest.input` declares the field as
 * required, and the executor previously crashed on a missing one. Callers that
 * treat "no arguments" as valid should keep passing `{}`.
 */
export function validateToolInput(
  toolName: string,
  input: unknown,
  schema: JsonSchema | undefined,
  options: ToolInputValidationOptions = {},
): void {
  if (schema === undefined) {
    return;
  }

  const issues: ToolInputValidationIssue[] = [];
  collectIssues(input, schema, '', issues, options);

  if (issues.length > 0) {
    throw new ToolInputValidationError(toolName, issues);
  }
}
