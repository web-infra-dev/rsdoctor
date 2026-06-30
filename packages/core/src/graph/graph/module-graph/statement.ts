import { SDK } from '@rsdoctor/types';
import { isSameRange } from './utils';

export class Statement implements SDK.StatementInstance {
  static getDefaultStatement(module: SDK.ModuleInstance) {
    const defaultPosition = {
      line: 1,
      column: 0,
    };
    const defaultRange = {
      start: { ...defaultPosition },
      end: { ...defaultPosition },
    };

    return new Statement(module, {
      source: { ...defaultRange },
      transformed: { ...defaultRange },
    });
  }

  readonly position: SDK.StatementPosition;

  readonly module: SDK.ModuleInstance;

  constructor(module: SDK.ModuleInstance, position: SDK.StatementPosition) {
    this.module = module;
    this.position = position;
  }

  isSame(statement: SDK.StatementInstance): boolean {
    return (
      this.module.id === statement.module.id &&
      isSameRange(this.position.transformed, statement.position.transformed)
    );
  }

  getSourcePosition(): SDK.SourceRange | undefined {
    const { module, position } = this;

    if (position.source) {
      return position.source;
    }

    if (module.getSourceMap()) {
      position.source = module.getSourceRange(position.transformed);
      return position.source;
    }
  }

  getLineCode() {
    const useSource = this.module.isPreferSource && this.position.source;
    const sourceCode = this.module.getSource();
    const source = useSource ? sourceCode.source : sourceCode.transformed;
    const line = useSource
      ? this.position.source!.start.line
      : this.position.transformed.start.line;

    if (typeof line === 'number') {
      return source.split('\n')[line - 1];
    }
  }

  toData(): SDK.StatementData {
    const position: SDK.StatementPosition = {
      transformed: this.position.transformed,
    };

    if (this.position.source) {
      position.source = this.position.source;
    }

    return {
      position,
      module: this.module.id,
    };
  }
}
