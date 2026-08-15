import type { JsonSchema } from './types';

/**
 * Tool input validation.
 *
 * The supported schema dialect is exactly what the tool catalog emits from
 * `OptionDef` (see `optionToJsonSchema` / `buildInputSchema` in
 * `commands/router.ts`): an object schema carrying `properties`, an optional
 * `required` list, `additionalProperties`, and per-property `type` (a single
 * name or a list of names), `enum`, `minimum`, and `maximum`. `items` is
 * handled as well so array properties declared by hand-written
 * `ToolDefinition`s are checked too.
 *
 * Two deliberate choices keep the executor from being stricter than the CLI it
 * mirrors:
 *
 * - Unknown keywords are ignored instead of rejected, so a richer schema never
 *   fails closed.
 * - Extra properties are accepted unless a schema explicitly declares
 *   `additionalProperties: false`. The catalog declares
 *   `additionalProperties: true` because `parseSubcommandOptions` and
 *   `appendToolSpecificOptions` silently drop options a subcommand does not
 *   declare, so rejecting unknown keys here would refuse input the CLI itself
 *   accepts.
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

function matchesSchemaType(value: unknown, type: unknown): boolean {
  if (Array.isArray(type)) {
    return type.some((entry) => matchesSchemaType(value, entry));
  }

  switch (type) {
    case 'array':
      return Array.isArray(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'null':
      return value === null;
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
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
  return typeof value === 'string' ? JSON.stringify(value) : String(value);
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

  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    issues.push({
      path,
      message: `${label} must be one of ${schema.enum
        .map(formatValue)
        .join(', ')}, received ${formatValue(value)}`,
    });
  }

  if (typeof value === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum) {
      issues.push({
        path,
        message: `${label} must be >= ${schema.minimum}, received ${value}`,
      });
    }
    if (typeof schema.maximum === 'number' && value > schema.maximum) {
      issues.push({
        path,
        message: `${label} must be <= ${schema.maximum}, received ${value}`,
      });
    }
  }

  if (Array.isArray(value)) {
    if (isRecord(schema.items)) {
      value.forEach((entry, index) => {
        collectIssues(entry, schema.items, `${path}[${index}]`, issues);
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
      if (typeof key === 'string' && !(key in value)) {
        issues.push({
          path: joinPath(path, key),
          message: `${label} is missing required property "${key}"`,
        });
      }
    }
  }

  for (const [key, entry] of Object.entries(value)) {
    const propertyPath = joinPath(path, key);
    const propertySchema = properties[key];

    if (propertySchema !== undefined) {
      collectIssues(entry, propertySchema, propertyPath, issues);
      continue;
    }

    if (schema.additionalProperties === false) {
      issues.push({
        path: propertyPath,
        message: `${describeLabel(propertyPath)} is not an allowed property`,
      });
      continue;
    }

    if (isRecord(schema.additionalProperties)) {
      collectIssues(entry, schema.additionalProperties, propertyPath, issues);
    }
  }
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
): void {
  if (schema === undefined) {
    return;
  }

  const issues: ToolInputValidationIssue[] = [];
  collectIssues(input, schema, '', issues);

  if (issues.length > 0) {
    throw new ToolInputValidationError(toolName, issues);
  }
}
