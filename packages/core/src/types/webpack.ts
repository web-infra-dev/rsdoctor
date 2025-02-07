import { SourcePosition } from '@rsdoctor/graph';
import type {
  Compiler,
  Compilation,
  ModuleGraph as WebpackModulePath,
  LoaderDefinitionFunction,
  Dependency,
  NormalModule,
} from 'webpack';
import { NormalModule as RspackNormalModule } from '@rspack/core';
import type { ExportsInfo as RspackExportsInfo } from 'node_modules/@rspack/core/dist/ExportsInfo';
import ModuleGraph from 'node_modules/@rspack/core/dist/ModuleGraph';
import { Dependency as RspackDependency } from 'node_modules/@rspack/core/dist/Dependency';

type GetMapValue<M extends Map<any, any>> =
  M extends Map<string, infer V> ? V : never;

export type NormalModuleFactory = ReturnType<
  Compiler['createNormalModuleFactory']
>;

export type IModuleGraph = ModuleGraph | WebpackModulePath;

interface RspackExportInfo {
  used: boolean;
  provideInfo: boolean | null | undefined;
  useInfo: boolean | null | undefined;
  canMangle: boolean;
}

export type IDependency = RspackDependency | Dependency;
export type INormalModule = RspackNormalModule | NormalModule;

export type SourceMapInput = Parameters<LoaderDefinitionFunction>[1];
export type SourceMap = Exclude<SourceMapInput, string | undefined>;
export type EntryPoint = GetMapValue<Compilation['entrypoints']>;
export type ExportInfo =
  | ReturnType<WebpackModulePath['getExportInfo']>
  | RspackExportInfo;
export type ExportsInfo =
  | ReturnType<WebpackModulePath['getExportsInfo']>
  | RspackExportsInfo;

export interface HarmonyImportSpecifierDependency
  extends Omit<IDependency, 'weak' | 'type' | 'category' | 'request' | 'loc'> {
  getIds(graph: IModuleGraph): string[];
  name: string;
  userRequest: string;
}

// export declare interface IDependency {
// 	weak?: boolean;
// 	get type(): string;
// 	get category(): string;
//   readonly request?: string | undefined;
// 	loc?: SyntheticDependencyLocation | RealDependencyLocation;
// }

declare interface SyntheticDependencyLocation {
  name: string;
  index?: number;
}

export declare interface RealDependencyLocation {
  start: SourcePosition;
  end?: SourcePosition;
  index?: number;
}
