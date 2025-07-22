import { Rule, Err, Plugin } from '@rsdoctor/types';
import { InternalBasePlugin } from './base';
import { DevToolError } from '@rsdoctor/utils/error';
import { time, timeEnd } from '@rsdoctor/utils/logger';

export class InternalErrorReporterPlugin<
  T extends Plugin.BaseCompiler,
> extends InternalBasePlugin<T> {
  public readonly name = 'error-reporter';

  public apply(compiler: T) {
    time('InternalErrorReporterPlugin.apply');
    try {
      compiler.hooks.done.tapPromise(this.tapPreOptions, this.done);
    } finally {
      timeEnd('InternalErrorReporterPlugin.apply');
    }
  }

  public done = async (stats: Plugin.BaseStats): Promise<void> => {
    time('InternalErrorReporterPlugin.done');
    try {
      const tasks: Promise<void>[] = [];
      const statsData = stats.toJson({
        all: false,
        errors: true,
        warnings: true,
      });

      if (stats.hasErrors()) {
        tasks.push(this.reportErrors(statsData.errors || []));
      }

      if (stats.hasWarnings()) {
        tasks.push(this.reportWarnings(statsData.warnings || []));
      }

      await Promise.all(tasks);
    } finally {
      timeEnd('InternalErrorReporterPlugin.done');
    }
  };

  public handleWebpackError(
    err: Plugin.BuildError,
    category: Rule.RuleMessageCategory,
    level: keyof typeof Err.ErrorLevel,
  ) {
    return DevToolError.from(err, {
      category,
      code: Rule.RuleMessageCodeEnumerated.Overlay,
      controller: { noStack: false },
      detail: {
        stack: 'stack' in err ? err.stack : err.message,
      },
      level,
    });
  }

  public async reportWarnings(warnings: Plugin.BuildError[]) {
    time('InternalErrorReporterPlugin.reportWarnings');
    try {
      const arr = warnings.map((warning) => {
        return this.handleWebpackError(
          warning,
          Rule.RuleMessageCategory.Compile,
          'Warn',
        );
      });
      this.sdk.reportError(arr);
    } finally {
      timeEnd('InternalErrorReporterPlugin.reportWarnings');
    }
  }

  public async reportErrors(errors: Plugin.BuildWarning[]) {
    time('InternalErrorReporterPlugin.reportErrors');
    try {
      const arr = errors.map((err) => {
        return this.handleWebpackError(
          err,
          Rule.RuleMessageCategory.Bundle,
          'Error',
        );
      });
      this.sdk.reportError(arr);
    } finally {
      timeEnd('InternalErrorReporterPlugin.reportErrors');
    }
  }
}
