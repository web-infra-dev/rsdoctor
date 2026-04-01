const dynamicImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<{ fetch: typeof fetch }>;

export async function getFetch(): Promise<typeof fetch> {
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch.bind(globalThis);
  }

  const mod = await dynamicImport('undici');
  return mod.fetch;
}
