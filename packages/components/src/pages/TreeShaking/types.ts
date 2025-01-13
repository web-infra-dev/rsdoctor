import { SDK } from '@rsdoctor/types';

export type TableKind = 'side-effect' | 'export';
export type SetEditorStatus = (
  module: SDK.ModuleInstance,
  ranges: SDK.SourceRange[],
  line?: number,
) => void;
