import { SDK } from '@rsdoctor/shared/types';

export type TableKind = 'side-effect' | 'export';
export type SetEditorStatus = (
  module: SDK.ModuleInstance,
  ranges: SDK.SourceRange[],
  line?: number,
) => void;
