import { createContext, useContext } from 'react';
import { SDK } from '@rsdoctor/types';

export interface ProjectInfoContextValue {
  project: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetProjectInfo> | null;
}

export const ProjectInfoContext = createContext<ProjectInfoContextValue>({
  project: null,
});

export function useProjectInfo() {
  return useContext(ProjectInfoContext);
}
