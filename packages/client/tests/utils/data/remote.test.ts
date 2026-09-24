import { describe, expect, it } from 'rstack/test';
import { RemoteDataLoader } from 'src/utils/data/remote';

describe('RemoteDataLoader', () => {
  it('loads hydrated static manifest data when cloudData is unavailable', async () => {
    const root = { hash: 'static-hash' };
    const loader = new RemoteDataLoader({ data: { root } } as any);

    await expect(loader.loadData('root' as any)).resolves.toStrictEqual(root);
  });

  it('prefers cloudData over data', async () => {
    const loader = new RemoteDataLoader({
      cloudData: { root: { hash: 'cloud-hash' } },
      data: { root: { hash: 'static-hash' } },
    } as any);

    await expect(loader.loadData('root' as any)).resolves.toStrictEqual({
      hash: 'cloud-hash',
    });
  });
});
