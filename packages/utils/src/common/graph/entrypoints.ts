import { SDK } from '@rsdoctor/types';

export function getEntryPoints(
  entrypoints: SDK.EntryPointData[],
): SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetEntryPoints> {
  return entrypoints;
}
