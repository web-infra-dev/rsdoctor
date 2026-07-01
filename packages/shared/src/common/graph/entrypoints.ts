import { SDK } from '@rsdoctor/shared/types';

export function getEntryPoints(
  entrypoints: SDK.EntryPointData[],
): SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetEntryPoints> {
  return entrypoints;
}
