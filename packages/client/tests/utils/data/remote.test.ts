import { describe, expect, it } from 'rstack/test';
import { SDK } from '@rsdoctor/shared/types';
import { RemoteDataLoader } from 'src/utils/data/remote';

describe('RemoteDataLoader', () => {
  it('loads inline data from a brief JSON report', async () => {
    const errors = [{ category: 'bundle', code: 'E1004' }];
    const loader = new RemoteDataLoader({
      data: {
        root: '/project',
        pid: 1,
        hash: 'hash',
        summary: {},
        configs: [],
        envinfo: {},
        errors,
      },
    } as any);

    const project = await loader.loadAPI(
      SDK.ServerAPI.API.GetProjectInfo,
      {} as any,
    );

    expect(project.errors).toBe(errors);
  });
});
