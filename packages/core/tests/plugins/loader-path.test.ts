import path from 'path';
import { isESMLoader } from '../../src/build-utils/build/utils/loader';
import type { Plugin } from '@rsdoctor/types';
import { describe, test, expect } from 'vitest';

describe('loader path detection', () => {
  describe('absolute paths', () => {
    test('Unix-like absolute paths', () => {
      expect(
        isESMLoader({
          loader: '/usr/local/my-loader.js',
        } as Plugin.BuildRuleSetRule),
      ).toBe(false);
      expect(
        isESMLoader({
          loader: '/home/user/loaders/custom-loader.js',
        } as Plugin.BuildRuleSetRule),
      ).toBe(false);
    });

    test('Windows absolute paths', () => {
      expect(
        isESMLoader({
          loader: 'C:\\Users\\loader.js',
        } as Plugin.BuildRuleSetRule),
      ).toBe(false);
      expect(
        isESMLoader({
          loader: 'D:\\Project\\loaders\\my-loader.js',
        } as Plugin.BuildRuleSetRule),
      ).toBe(false);
      expect(
        isESMLoader({
          loader: '\\\\server\\shared\\loader.js',
        } as Plugin.BuildRuleSetRule),
      ).toBe(false);
    });
  });

  describe('relative paths', () => {
    test('current directory relative paths', () => {
      expect(
        isESMLoader({ loader: './loader.js' } as Plugin.BuildRuleSetRule),
      ).toBe(false);
      expect(
        isESMLoader({
          loader: './loaders/my-loader.js',
        } as Plugin.BuildRuleSetRule),
      ).toBe(false);
    });

    test('parent directory relative paths', () => {
      expect(
        isESMLoader({ loader: '../loader.js' } as Plugin.BuildRuleSetRule),
      ).toBe(false);
      expect(
        isESMLoader({
          loader: '../loaders/custom-loader.js',
        } as Plugin.BuildRuleSetRule),
      ).toBe(false);
    });
  });

  describe('package names', () => {
    test('common loader package names', () => {
      expect(
        isESMLoader({ loader: 'babel-loader' } as Plugin.BuildRuleSetRule),
      ).toBe(false);
      expect(
        isESMLoader({ loader: 'ts-loader' } as Plugin.BuildRuleSetRule),
      ).toBe(false);
      expect(
        isESMLoader({ loader: 'style-loader' } as Plugin.BuildRuleSetRule),
      ).toBe(false);
    });
  });

  describe('mixed path separators', () => {
    test('handles mixed path separators correctly', () => {
      const mixedPath = path.join('some', 'mixed', 'path', 'loader.js');
      expect(
        isESMLoader({ loader: mixedPath } as Plugin.BuildRuleSetRule),
      ).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('handles empty and invalid inputs', () => {
      expect(isESMLoader({ loader: '' } as Plugin.BuildRuleSetRule)).toBe(
        false,
      );
      expect(isESMLoader({ loader: '.' } as Plugin.BuildRuleSetRule)).toBe(
        false,
      );
      expect(isESMLoader({ loader: '..' } as Plugin.BuildRuleSetRule)).toBe(
        false,
      );
      expect(isESMLoader({ loader: '/' } as Plugin.BuildRuleSetRule)).toBe(
        false,
      );
      expect(isESMLoader({ loader: '\\' } as Plugin.BuildRuleSetRule)).toBe(
        false,
      );
    });
  });

  describe('loader objects', () => {
    test('handles loader objects', () => {
      expect(
        isESMLoader({
          loader: '/absolute/path/loader.js',
        } as Plugin.BuildRuleSetRule),
      ).toBe(false);
      expect(
        isESMLoader({
          loader: './relative/path/loader.js',
        } as Plugin.BuildRuleSetRule),
      ).toBe(false);
      expect(
        isESMLoader({ loader: 'babel-loader' } as Plugin.BuildRuleSetRule),
      ).toBe(false);
    });
  });
});
