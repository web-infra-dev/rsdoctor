import { describe, expect, it } from '@rstest/core';

import { getToolCatalog } from '../src/commands';
import type { ToolDefinition } from '../src/core/types';
import { ToolInputValidationError } from '../src/core/validate-input';
import {
  createInProcessRsdoctorCliToolExecutor,
  createRsdoctorCliToolExecutor,
} from '../src/executor';

interface Harness {
  execute: (input: unknown) => Promise<unknown>;
  commands: string[][];
}

function createHarness(inputSchema: ToolDefinition['inputSchema']): Harness {
  const commands: string[][] = [];
  const executor = createRsdoctorCliToolExecutor({
    tools: [
      {
        name: 'schema_tool',
        description: 'test tool',
        inputSchema,
        buildCommand: () => ['schema-tool'],
      },
    ],
    runCommand: async (command) => {
      commands.push(command);
      return JSON.stringify({ ok: true, data: { called: true } });
    },
  });

  return {
    commands,
    execute: (input: unknown) =>
      executor.execute({
        toolName: 'schema_tool',
        input: input as Record<string, unknown>,
        dataFile: '/tmp/demo.json',
      }),
  };
}

async function expectValidationError(
  run: () => Promise<unknown>,
): Promise<ToolInputValidationError> {
  let caught: unknown;
  try {
    await run();
  } catch (error) {
    caught = error;
  }

  expect(caught).toBeInstanceOf(ToolInputValidationError);
  return caught as ToolInputValidationError;
}

describe('tool input validation', () => {
  it('passes valid input through unchanged', async () => {
    const harness = createHarness({
      type: 'object',
      properties: {
        id: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 10 },
      },
      required: ['id'],
      additionalProperties: false,
    });

    const result = await harness.execute({ id: 'main', limit: 5 });

    expect(result).toEqual({ ok: true, data: { called: true } });
    expect(harness.commands).toEqual([['schema-tool']]);
  });

  it('accepts an empty object for a tool without required fields', async () => {
    const harness = createHarness({
      type: 'object',
      properties: { id: { type: 'string' } },
      additionalProperties: false,
    });

    await expect(harness.execute({})).resolves.toEqual({
      ok: true,
      data: { called: true },
    });
  });

  it('rejects missing required properties before dispatch', async () => {
    const harness = createHarness({
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
      additionalProperties: false,
    });

    const error = await expectValidationError(() => harness.execute({}));

    expect(error.toolName).toBe('schema_tool');
    expect(error.issues).toEqual([
      { path: 'id', message: 'input is missing required property "id"' },
    ]);
    expect(error.message).toBe(
      'Invalid input for rsdoctor tool schema_tool: input is missing required property "id"',
    );
    expect(harness.commands).toEqual([]);
  });

  it('rejects wrong primitive types', async () => {
    const harness = createHarness({
      type: 'object',
      properties: { limit: { type: 'integer' } },
      additionalProperties: false,
    });

    const error = await expectValidationError(() =>
      harness.execute({ limit: '10' }),
    );

    expect(error.issues).toEqual([
      {
        path: 'limit',
        message: '"limit" must be of type integer, received string',
      },
    ]);
    expect(harness.commands).toEqual([]);
  });

  it('rejects values outside declared numeric bounds', async () => {
    const harness = createHarness({
      type: 'object',
      properties: { limit: { type: 'integer', minimum: 1, maximum: 10 } },
      additionalProperties: false,
    });

    const error = await expectValidationError(() =>
      harness.execute({ limit: 99 }),
    );

    expect(error.issues).toEqual([
      { path: 'limit', message: '"limit" must be <= 10, received 99' },
    ]);
  });

  it('rejects unknown enum values', async () => {
    const harness = createHarness({
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['cjs', 'barrel'] },
      },
      additionalProperties: false,
    });

    const error = await expectValidationError(() =>
      harness.execute({ category: 'esm' }),
    );

    expect(error.issues).toEqual([
      {
        path: 'category',
        message: '"category" must be one of "cjs", "barrel", received "esm"',
      },
    ]);
  });

  it('rejects wrong array item types', async () => {
    const harness = createHarness({
      type: 'object',
      properties: {
        fields: { type: 'array', items: { type: 'string' } },
      },
      additionalProperties: false,
    });

    const error = await expectValidationError(() =>
      harness.execute({ fields: ['id', 2] }),
    );

    expect(error.issues).toEqual([
      {
        path: 'fields[1]',
        message: '"fields[1]" must be of type string, received number',
      },
    ]);
  });

  it('rejects non-object input where an object is required', async () => {
    const harness = createHarness({
      type: 'object',
      properties: {},
      additionalProperties: true,
    });

    const undefinedInput = await expectValidationError(() =>
      harness.execute(undefined),
    );
    expect(undefinedInput.issues).toEqual([
      { path: '', message: 'input must be of type object, received undefined' },
    ]);

    const arrayInput = await expectValidationError(() => harness.execute([]));
    expect(arrayInput.issues).toEqual([
      { path: '', message: 'input must be of type object, received array' },
    ]);

    expect(harness.commands).toEqual([]);
  });

  it('rejects unknown properties only when the schema forbids them', async () => {
    const strict = createHarness({
      type: 'object',
      properties: {},
      additionalProperties: false,
    });

    const error = await expectValidationError(() =>
      strict.execute({ nope: 1 }),
    );
    expect(error.issues).toEqual([
      { path: 'nope', message: '"nope" is not an allowed property' },
    ]);

    const open = createHarness({
      type: 'object',
      properties: {},
      additionalProperties: true,
    });
    await expect(open.execute({ nope: 1 })).resolves.toEqual({
      ok: true,
      data: { called: true },
    });
  });

  it('reports every mismatch in a single error', async () => {
    const harness = createHarness({
      type: 'object',
      properties: {
        id: { type: 'string' },
        limit: { type: 'integer', minimum: 1 },
      },
      required: ['id'],
      additionalProperties: false,
    });

    const error = await expectValidationError(() =>
      harness.execute({ limit: 0, extra: true }),
    );

    expect(error.issues.map((issue) => issue.path)).toEqual([
      'id',
      'limit',
      'extra',
    ]);
  });

  it('validates catalog controls for the spawned cli executor', async () => {
    const commands: string[][] = [];
    const executor = createRsdoctorCliToolExecutor({
      tools: getToolCatalog(),
      runCommand: async (command) => {
        commands.push(command);
        return JSON.stringify({ ok: true, data: {} });
      },
    });

    const error = await expectValidationError(() =>
      executor.execute({
        toolName: 'chunks_list',
        input: { page: 'two', pageSize: 5000 },
        dataFile: '/tmp/demo.json',
      }),
    );

    expect(error.toolName).toBe('chunks_list');
    expect(error.issues).toEqual([
      {
        path: 'page',
        message: '"page" must be of type integer, received string',
      },
      {
        path: 'pageSize',
        message: '"pageSize" must be <= 1000, received 5000',
      },
    ]);
    expect(commands).toEqual([]);
  });

  it('validates catalog controls for the in-process executor', async () => {
    const executor = createInProcessRsdoctorCliToolExecutor();

    const error = await expectValidationError(() =>
      executor.execute({
        toolName: 'build_summary',
        input: { page: 'two' },
        dataFile: '/nonexistent/rsdoctor-data.json',
      }),
    );

    expect(error.toolName).toBe('build_summary');
    expect(error.issues).toEqual([
      {
        path: 'page',
        message: '"page" must be of type integer, received string',
      },
    ]);
  });

  it('keeps rejecting unknown tools before validating input', async () => {
    const executor = createInProcessRsdoctorCliToolExecutor();

    await expect(
      executor.execute({
        toolName: 'not_a_tool',
        input: undefined as unknown as Record<string, unknown>,
        dataFile: '/tmp/demo.json',
      }),
    ).rejects.toThrow('Unknown rsdoctor tool: not_a_tool');
  });
});
