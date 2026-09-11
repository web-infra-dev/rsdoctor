import { describe, expect, it } from '@rstest/core';
import { chunkIdSchema } from '../src/server/schemas';

describe('server/server', () => {
  it('accepts string chunk ids used by chunk reports', () => {
    expect(chunkIdSchema.parse('77')).toBe('77');
    expect(() => chunkIdSchema.parse(77)).toThrow();
  });
});
