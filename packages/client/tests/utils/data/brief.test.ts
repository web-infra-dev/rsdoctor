import { afterEach, beforeEach, describe, expect, it, rs } from 'rstack/test';
import { Algorithm, Data } from '@rsdoctor/shared/common-browser';
import { Constants, SDK } from '@rsdoctor/shared/types';
import { BriefDataLoader, decompressBriefText } from 'src/utils/data/brief';

const TAG = Constants.WINDOW_RSDOCTOR_TAG;
const globals = globalThis as unknown as { window?: Record<string, unknown> };

function setReport(data: Record<string, unknown>) {
  globals.window![TAG] = data;
}

function createLoader() {
  return new BriefDataLoader({ data: [] } as any);
}

describe('BriefDataLoader', () => {
  const originalWindow = globals.window;

  beforeEach(() => {
    globals.window = {};
    rs.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    globals.window = originalWindow;
  });

  it('decodes text written by compressText', async () => {
    const text = JSON.stringify({ path: '/src/ünïcode/👍.ts', n: [1, 2, 3] });
    const encoded = Algorithm.compressText(text);
    await expect(decompressBriefText(encoded)).resolves.toBe(text);
  });

  it('decodes each section once for every loader', async () => {
    const chunkGraph = { assets: [{ id: 1, path: 'a.js' }], chunks: [] };
    setReport({
      chunkGraph: Algorithm.compressText(JSON.stringify(chunkGraph)),
    });
    const parse = rs.spyOn(JSON, 'parse');

    const [first, second] = await Promise.all([
      createLoader().loadData('chunkGraph'),
      createLoader().loadData('chunkGraph'),
    ]);

    expect(first).toEqual(chunkGraph);
    expect(second).toBe(first);
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it('does not reuse sections across report data objects', async () => {
    setReport({ root: Algorithm.compressText(JSON.stringify('/first')) });
    await expect(createLoader().loadData('root')).resolves.toBe('/first');

    // The uploader replaces the report data without reloading the page.
    setReport({ root: Algorithm.compressText(JSON.stringify('/second')) });
    await expect(createLoader().loadData('root')).resolves.toBe('/second');
  });

  it('resolves sections that are already objects or thenables', async () => {
    const thenable = {
      then(resolve: (value: unknown) => void) {
        resolve({ modules: [{ id: 1 }] });
      },
    };
    setReport({ moduleGraph: thenable, summary: { costs: [] } });
    const loader = createLoader();

    await expect(loader.loadData('moduleGraph')).resolves.toEqual({
      modules: [{ id: 1 }],
    });
    await expect(loader.loadData('summary')).resolves.toEqual({ costs: [] });
  });

  it('returns the original value when a section is not compressed JSON', async () => {
    setReport({ hash: 'not-compressed' });
    await expect(createLoader().loadData('hash')).resolves.toBe(
      'not-compressed',
    );
  });

  it('reuses API responses for the same API and body', async () => {
    setReport({ root: Algorithm.compressText(JSON.stringify('/root')) });
    const loadAPI = rs
      .spyOn(Data.APIDataLoader.prototype, 'loadAPI')
      .mockImplementation(async (...args: unknown[]) => ({ args }) as any);

    const body = { moduleId: 1 };
    const [first, second] = await Promise.all([
      createLoader().loadAPI(SDK.ServerAPI.API.GetModuleDetails, body),
      createLoader().loadAPI(SDK.ServerAPI.API.GetModuleDetails, {
        moduleId: 1,
      }),
    ]);
    const other = await createLoader().loadAPI(
      SDK.ServerAPI.API.GetModuleDetails,
      { moduleId: 2 },
    );

    expect(second).toBe(first);
    expect(other).not.toBe(first);
    expect(loadAPI).toHaveBeenCalledTimes(2);
  });

  it('retries an API call that failed', async () => {
    setReport({ root: Algorithm.compressText(JSON.stringify('/root')) });
    const loadAPI = rs
      .spyOn(Data.APIDataLoader.prototype, 'loadAPI')
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValueOnce('ok' as any);
    const loader = createLoader();

    await expect(
      loader.loadAPI(SDK.ServerAPI.API.GetProjectInfo),
    ).rejects.toThrow('failed');
    await expect(
      loader.loadAPI(SDK.ServerAPI.API.GetProjectInfo),
    ).resolves.toBe('ok');
    expect(loadAPI).toHaveBeenCalledTimes(2);
  });

  it('keeps a bounded number of API responses', async () => {
    setReport({ root: Algorithm.compressText(JSON.stringify('/root')) });
    const loadAPI = rs
      .spyOn(Data.APIDataLoader.prototype, 'loadAPI')
      .mockImplementation(async () => ({}) as any);
    const loader = createLoader();

    for (let moduleId = 0; moduleId <= 64; moduleId++) {
      await loader.loadAPI(SDK.ServerAPI.API.GetModuleDetails, { moduleId });
    }
    expect(loadAPI).toHaveBeenCalledTimes(65);

    // The most recent response is kept; the oldest was evicted.
    await loader.loadAPI(SDK.ServerAPI.API.GetModuleDetails, { moduleId: 64 });
    expect(loadAPI).toHaveBeenCalledTimes(65);
    await loader.loadAPI(SDK.ServerAPI.API.GetModuleDetails, { moduleId: 0 });
    expect(loadAPI).toHaveBeenCalledTimes(66);
  });
});
