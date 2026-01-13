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

  it('should clone Date and RegExp objects', () => {
    const date = new Date('2024-01-01T00:00:00Z');
    const clonedDate = safeCloneDeep(date);
    expect(clonedDate).toBeInstanceOf(Date);
    expect(clonedDate).not.toBe(date);
    expect(clonedDate.getTime()).toBe(date.getTime());

    const regex = /test/gi;
    const clonedRegex = safeCloneDeep(regex);
    expect(clonedRegex).toBeInstanceOf(RegExp);
    expect(clonedRegex).not.toBe(regex);
    expect(clonedRegex.source).toBe(regex.source);
    expect(clonedRegex.flags).toBe(regex.flags);
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
    expect(cloned.date).toBeInstanceOf(Date);
    expect(cloned.date).not.toBe(date);
    expect(cloned.date.getTime()).toBe(date.getTime());
    expect(cloned.regex).toBeInstanceOf(RegExp);
    expect(cloned.regex).not.toBe(regex);
    expect(cloned.regex.source).toBe(regex.source);
    expect(cloned.regex.flags).toBe(regex.flags);
    expect(cloned.array).not.toBe(obj.array);
    expect(cloned.nested.deep).not.toBe(obj.nested.deep);
  });
});
