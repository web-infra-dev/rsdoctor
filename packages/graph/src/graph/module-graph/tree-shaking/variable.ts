import { SDK } from '@rsdoctor/types';
import { ExportInfo } from './export';

let id = 1;

export class Variable implements SDK.VariableInstance {
  static init() {
    id = 1;
  }

  readonly id = id++;

  readonly name: string;

  readonly module: SDK.ModuleInstance;

  readonly usedInfo: string;

  readonly identifier: SDK.StatementInstance;

  private _exported?: SDK.ExportInstance;

  constructor(
    name: string,
    module: SDK.ModuleInstance,
    usedInfo: string,
    identifier: SDK.StatementInstance,
  ) {
    this.name = name;
    this.module = module;
    this.usedInfo = usedInfo;
    this.identifier = identifier;
  }

  get isUsed() {
    return this._exported ? this._exported.getSideEffects().length > 0 : false;
  }

  setExportInfo(info: SDK.ExportInstance): void {
    this._exported = info;
    (info as ExportInfo).variable = this;
  }

  getExportInfo() {
    return this._exported;
  }

  toData(): SDK.VariableData {
    const data: SDK.VariableData = {
      id: this.id,
      name: this.name,
      module: this.module.id,
      identifier: this.identifier.toData(),
      usedInfo: this.usedInfo,
    };

    if (this._exported) {
      data.exported = this._exported.id;
    }

    return data;
  }
}
