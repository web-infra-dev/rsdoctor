import { describe, it, expect } from '@rstest/core';
import { Crypto } from '../../src/common';

describe('test src/crypto.ts', () => {
  describe('encode & decode', () => {
    const strings = [
      '00123sdfdkfkskfk',
      '~!｜.[]{}&……%（）()`·sdkf121',
      '~sd～d8哈哈哈😊',
      '🔚🔜🌹👌',
    ];

    it('encode()', () => {
      expect(
        strings.map((e) => `"${e}" -> "${Crypto.encode(e)}"`).join('\n'),
      ).toMatchSnapshot();
    });

    it('decode()', () => {
      const res = strings
        .map((e) => Crypto.encode(e))
        .map((e) => Crypto.decode(e));
      expect(res).toStrictEqual(strings);
    });
  });
});
