import { SDK } from "@rsdoctor/types";

export interface ChartProps {
  loaders: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetLoaderChartData>;
  cwd: string;
}

export interface CommonMetricPart<T extends string = string> {
  _n?: boolean;
  _c?: string;
  p: string;
  n: T;
  ext?: unknown;
}

export declare type Metric = DurationMetric;
export interface DurationMetric extends CommonMetricPart {
  _r?: [start: string, end: string];
  s: number;
  e: number;
  c?: DurationMetric[];
}

// Trace Events.
export enum ETraceEventPhase {
  // Standard
  BEGIN = 'B',
  END = 'E',
  COMPLETE = 'X',
  INSTANT = 'I',

  // Mark
  MARK = 'R',
}

type MicroSeconds = number;
type ProcessID = number | string;
type ArgsType = {
  p: string,
  n: string,
  s: number,
  e: number,
}

export interface ITraceEventData {
  /**
   *Any arguments provided for the event. Some of the event types have required argument fields, otherwise, you can put any information you wish in here. The arguments are displayed in Trace Viewer when you view an event in the analysis section.
   */
  args: ArgsType;
  /**
   * The name of the event, as displayed in Chart.
   */
  name: string;
  /**
   * The event type. This is a single character which changes depending on the type of event being output.
   */
  ph: ETraceEventPhase;
  /**
   *  The process ID for the process that output this event.
   */
  pid: ProcessID;
  /**
   *  The tracing clock timestamp of the event. The timestamps are provided at microsecond granularity.
   */
  ts: MicroSeconds;
  /**
   *  specify the tracing clock duration of complete events in microseconds.
   */
  dur?: MicroSeconds;
}