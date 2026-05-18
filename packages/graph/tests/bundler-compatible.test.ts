import { describe, expect, it } from '@rstest/core';
import { Bundler } from '../src';

describe('Bundler compatible helpers', () => {
  it('calls originalSource with the bundler module context', () => {
    const module = {
      _originalSource: {
        source() {
          return 'transformed source';
        },
      },
      originalSource() {
        if (this !== module) {
          throw new TypeError(
            "Cannot read properties of undefined (reading '_originalSource')",
          );
        }

        return this._originalSource;
      },
    };

    expect(Bundler.getModuleSource(module as any)).toBe('transformed source');
  });

  it('returns empty source when originalSource is unavailable', () => {
    const module = {
      originalSource() {
        throw new TypeError('source is unavailable');
      },
    };

    expect(Bundler.getModuleSource(module as any)).toBe('');
  });
});
