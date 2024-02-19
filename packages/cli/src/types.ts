import { Common } from '@rsdoctor/types';
import { Argv } from 'yargs';

export interface Command<CMD, Options = Common.PlainObject, Result = unknown> {
  (ctx: CommandContext): CommandOutput<CMD, Options, Result>;
}

export interface CommandContext {
  name: string;
  bin: string;
  cwd: string;
}

export interface CommandOutput<CMD, Options, Result> {
  command: CMD;
  description: string;
  options(yargs: Argv<Options>): void;
  action(args: Options): Result | Promise<Result>;
}

export type GetCommandArgumentsType<T> = T extends Command<
  infer C,
  infer Options,
  infer Result
>
  ? {
      command: C;
      options: Options;
      result: Result;
    }
  : unknown;
