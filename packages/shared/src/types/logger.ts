export enum LogLevel {
  Silent,
  Error,
  Warning,
  Info,
  Debug,
  Verbose,
}

export type LogLevelName = keyof typeof LogLevel;
