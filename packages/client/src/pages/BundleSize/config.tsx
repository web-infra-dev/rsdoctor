import { createContext } from 'react';

interface config {
  setModuleJumpList(ids: number[]): void;
  moduleJumpList: number[];
}

export const ModuleGraphListContext = createContext<config>({
  setModuleJumpList(_ids: number[]): void {},
  moduleJumpList: [] as number[],
});
