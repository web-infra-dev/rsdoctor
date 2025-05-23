import { RuleMessage, BaseRuleStoreData, RuleStoreDataItem } from '../rule';
import { ErrorLevel as Severity, Range, FixData } from '../error';
import { SeverityString } from './rule';

export { ErrorLevel as Severity } from '../error';
export type { Range, OffsetRange, Position, FixData } from '../error';

/** Diagnostic recommendations */
export interface Suggestion {
  description: string;
  fixData?: FixData;
}

/** Error file information */
export interface ReportDocument {
  /** file path */
  path: string;
  /**  Is it a transformed code */
  isTransformed?: boolean;
  /** code content */
  content: string;
  range: Range;
}

/** Report erroneous data */
export interface ReportData {
  /** Error message */
  message: string;
  /** Modify severity dynamically at runtime */
  severity?: SeverityString;
  /** Error file information  */
  document?: ReportDocument;
  /** Diagnostic suggestions */
  suggestions?: Suggestion;
  /**
   * Detailed information
   *   - Mainly additional data provided to the platform.
   */
  detail?: any;
}

export type ReportDetailData<T extends BaseRuleStoreData> = Omit<
  T,
  keyof BaseRuleStoreData
> & {
  /**
   * Error text
   * - When this is present, Diagnostic ['message'] will be overwritten
   */
  description?: string;
};

export interface Diagnostic
  extends Omit<ReportData, 'severity'>,
    Pick<RuleMessage, 'category' | 'code'> {
  severity: Severity;
  title: string;
  detail?: RuleStoreDataItem;
}
