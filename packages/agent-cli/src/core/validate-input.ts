import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';

import type { JsonSchema } from './types';

export interface ToolInputValidationIssue {
  path: string;
  message: string;
}

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

export interface ToolInputValidationOptions {
  allowedAdditionalProperties?: ReadonlySet<string>;
}

const ajv = new Ajv({
  allErrors: true,
  allowUnionTypes: true,
  strict: false,
});

const validatorCache = new WeakMap<
  JsonSchema,
  Map<ReadonlySet<string> | undefined, ValidateFunction>
>();

function buildValidationSchema(
  schema: JsonSchema,
  allowedAdditionalProperties?: ReadonlySet<string>,
): JsonSchema {
  if (
    schema.additionalProperties !== false ||
    allowedAdditionalProperties === undefined
  ) {
    return schema;
  }

  const properties = { ...schema.properties };
  for (const property of allowedAdditionalProperties) {
    properties[property] ??= {};
  }

  return { ...schema, properties };
}

function getValidator(
  schema: JsonSchema,
  allowedAdditionalProperties?: ReadonlySet<string>,
): ValidateFunction {
  let validators = validatorCache.get(schema);
  if (validators === undefined) {
    validators = new Map();
    validatorCache.set(schema, validators);
  }

  let validate = validators.get(allowedAdditionalProperties);
  if (validate === undefined) {
    validate = ajv.compile(
      buildValidationSchema(schema, allowedAdditionalProperties),
    );
    validators.set(allowedAdditionalProperties, validate);
  }
  return validate;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeNumericStrings(value: unknown, schema: unknown): unknown {
  if (!isRecord(schema)) return value;

  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  const acceptsString = types.includes('string');
  if (typeof value === 'string' && !acceptsString && value.trim() !== '') {
    const parsed = Number(value);
    if (
      Number.isFinite(parsed) &&
      (types.includes('number') ||
        (types.includes('integer') && Number.isInteger(parsed)))
    ) {
      return parsed;
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeNumericStrings(item, schema.items));
  }

  if (!isRecord(value)) return value;

  const properties = isRecord(schema.properties) ? schema.properties : {};
  const additionalProperties = isRecord(schema.additionalProperties)
    ? schema.additionalProperties
    : undefined;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      normalizeNumericStrings(item, properties[key] ?? additionalProperties),
    ]),
  );
}

function decodePointerSegment(segment: string): string {
  return segment.replaceAll('~1', '/').replaceAll('~0', '~');
}

function getPathSegments(instancePath: string): string[] {
  return instancePath
    .split('/')
    .slice(1)
    .map((segment) => decodePointerSegment(segment));
}

function formatPath(segments: string[]): string {
  return segments.reduce(
    (path, segment) =>
      /^\d+$/.test(segment)
        ? `${path}[${segment}]`
        : path === ''
          ? segment
          : `${path}.${segment}`,
    '',
  );
}

function describeLabel(path: string): string {
  return path === '' ? 'input' : `"${path}"`;
}

function formatIssue(error: ErrorObject): ToolInputValidationIssue {
  const segments = getPathSegments(error.instancePath);
  const basePath = formatPath(segments);

  if (error.keyword === 'required') {
    return {
      path: formatPath([...segments, String(error.params.missingProperty)]),
      message: `${describeLabel(basePath)} ${error.message ?? 'is invalid'}`,
    };
  }

  if (error.keyword === 'additionalProperties') {
    const path = formatPath([
      ...segments,
      String(error.params.additionalProperty),
    ]);
    return {
      path,
      message: `${describeLabel(path)} is not an allowed property`,
    };
  }

  return {
    path: basePath,
    message: `${describeLabel(basePath)} ${error.message ?? 'is invalid'}`,
  };
}

export function validateToolInput(
  toolName: string,
  input: unknown,
  schema: JsonSchema | undefined,
  options: ToolInputValidationOptions = {},
): void {
  if (schema === undefined) return;

  const validate = getValidator(schema, options.allowedAdditionalProperties);
  if (validate(normalizeNumericStrings(input, schema))) return;

  throw new ToolInputValidationError(
    toolName,
    (validate.errors ?? [])
      .toSorted(
        (left, right) =>
          Number(left.keyword === 'additionalProperties') -
          Number(right.keyword === 'additionalProperties'),
      )
      .map(formatIssue),
  );
}
