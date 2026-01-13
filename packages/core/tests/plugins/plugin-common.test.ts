import { describe, it, expect } from '@rstest/core';
import { safeCloneDeep } from '@/inner-plugins/utils/plugin-common';

describe('safeCloneDeep', () => {
  it('should handle primitive values', () => {
    expect(safeCloneDeep(null)).toBe(null);
    expect(safeCloneDeep(undefined)).toBe(undefined);
    expect(safeCloneDeep('hello')).toBe('hello');
    expect(safeCloneDeep(42)).toBe(42);
    expect(safeCloneDeep(true)).toBe(true);
    const sym = Symbol('test');
    expect(safeCloneDeep(sym)).toBe(sym);
  });

  it('should convert Date and RegExp objects to string', () => {
    const date = new Date('2024-01-01T00:00:00Z');
    const clonedDate = safeCloneDeep(date);
    expect(typeof clonedDate).toBe('string');
    expect(clonedDate).toBe(date.toString());

    const regex = /test/gi;
    const clonedRegex = safeCloneDeep(regex);
    expect(typeof clonedRegex).toBe('string');
    expect(clonedRegex).toBe(regex.toString());
  });

  it('should clone arrays and nested structures', () => {
    const arr = [1, 'hello', [2, 3], { a: 1 }];
    const cloned = safeCloneDeep(arr);
    expect(cloned).toEqual(arr);
    expect(cloned).not.toBe(arr);
    expect(cloned[2]).not.toBe(arr[2]);
    expect(cloned[3]).not.toBe(arr[3]);
  });

  it('should clone objects with nested structures', () => {
    const obj = {
      a: 1,
      b: { c: 2 },
      items: [1, 2, 3],
    };
    const cloned = safeCloneDeep(obj);
    expect(cloned).toEqual(obj);
    expect(cloned).not.toBe(obj);
    expect(cloned.b).not.toBe(obj.b);
    expect(cloned.items).not.toBe(obj.items);
  });

  it('should handle circular references', () => {
    const obj: any = { a: 1 };
    obj.self = obj;
    const cloned = safeCloneDeep(obj);
    expect(cloned).not.toBe(obj);
    expect(cloned.a).toBe(1);
    expect(cloned.self).toBe(cloned);
  });

  it('should skip read-only properties (getter without setter)', () => {
    const obj: any = {};
    Object.defineProperty(obj, 'readOnly', {
      get() {
        return 'read-only value';
      },
      enumerable: true,
      configurable: true,
    });
    obj.normal = 'value';
    const cloned = safeCloneDeep(obj);
    expect(cloned.normal).toBe('value');
    expect('readOnly' in cloned).toBe(false);
  });

  it('should handle Symbol properties', () => {
    const sym = Symbol('test');
    const obj: any = { a: 1, [sym]: 'symbol value' };
    const cloned = safeCloneDeep(obj);
    expect(cloned.a).toBe(1);
    expect(cloned[sym]).toBe('symbol value');
  });

  it('should skip properties that throw when accessed', () => {
    const obj: any = { normal: 'value' };
    Object.defineProperty(obj, 'throws', {
      get() {
        throw new Error('Cannot access');
      },
      enumerable: true,
      configurable: true,
    });
    const cloned = safeCloneDeep(obj);
    expect(cloned.normal).toBe('value');
    expect('throws' in cloned).toBe(false);
  });

  it('should handle complex nested structures', () => {
    const date = new Date('2024-01-01');
    const regex = /test/gi;
    const obj = {
      string: 'hello',
      number: 42,
      date,
      regex,
      array: [1, 2, { nested: 'value' }],
      nested: { deep: { value: 'deep value' } },
    };
    const cloned = safeCloneDeep(obj);
    expect(cloned).not.toBe(obj);
    expect(cloned.string).toBe('hello');
    expect(typeof cloned.date).toBe('string');
    expect(cloned.date).toBe(date.toString());
    expect(typeof cloned.regex).toBe('string');
    expect(cloned.regex).toBe(regex.toString());
    expect(cloned.array).not.toBe(obj.array);
    expect(cloned.nested.deep).not.toBe(obj.nested.deep);
  });
});
