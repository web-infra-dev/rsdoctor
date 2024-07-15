import { describe, it, expect } from 'vitest';
import { Json } from '../src/build';

describe('test src/json.ts', () => {
  describe('stringify()', () => {
    it('string & number & null & undefined & boolean', async () => {
      expect(await Json.stringify('abcde')).toEqual('"abcde"');
      expect(await Json.stringify(123)).toEqual('123');
      expect(await Json.stringify(null)).toEqual('null');
      expect(await Json.stringify(undefined)).toEqual(undefined);
      expect(await Json.stringify(true)).toEqual('true');
      expect(await Json.stringify(false)).toEqual('false');
    });

    it('Array & Object', async () => {
      expect(await Json.stringify(['abcde'])).toMatchSnapshot();
      expect(
        await Json.stringify(['abcde', 123, null, undefined, true, false]),
      ).toMatchSnapshot();
      expect(
        await Json.stringify([
          { a: 1, b: undefined, c: null },
          1,
          [2, { k: 1 }],
        ]),
      ).toMatchSnapshot();

      expect(
        await Json.stringify({ a: 1, b: undefined, c: null }),
      ).toMatchSnapshot();
      expect(
        await Json.stringify({ a: 1, b: undefined, c: null, d: { e: 23 } }),
      ).toMatchSnapshot();
      expect(
        await Json.stringify({
          d: { e: 23, f: null, g: undefined, h: { a: 1 } },
        }),
      ).toMatchSnapshot();
    });
  });
});
