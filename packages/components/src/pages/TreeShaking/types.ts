import type { Module, SourceRange } from '@rsdoctor/graph';

export type TableKind = 'side-effect' | 'export';
export type SetEditorStatus = (
  module: Module,
  ranges: SourceRange[],
  line?: number,
) => void;
