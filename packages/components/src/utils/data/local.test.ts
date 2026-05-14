import { describe, expect, it, rs } from '@rstest/core';
import { SDK } from '@rsdoctor/types';
import { LocalServerDataLoader } from './local';

describe('LocalServerDataLoader', () => {
  it('disposes subscriptions when request body strings contain delimiters', () => {
    const loader = new LocalServerDataLoader({
      data: {},
    } as any);

    loader.onDataUpdate(
      SDK.ServerAPI.API.GetModuleByName,
      { name: 'foo::bar' } as any,
      rs.fn(),
    );

    expect(() => loader.dispose()).not.toThrow();
  });
});
