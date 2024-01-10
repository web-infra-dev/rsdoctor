import { InternalBasePlugin } from '../plugins';
import { Linter } from '../../rules';
import { DevToolError } from '@rsdoctor/utils/error';
import { isArray, pull } from 'lodash';
import { Plugin } from '@rsdoctor/types'
import { WebpackError } from 'webpack';

export class InternalRulesPlugin extends InternalBasePlugin<Plugin.BaseCompiler> {
  public readonly name = 'rules';

  public apply(compiler: Plugin.BaseCompiler) {
    compiler.hooks.done.tapPromise(this.tapPreOptions, this.done);
  }

  public done = async (stats: Plugin.BaseStats): Promise<void> => {
    await this.lint(stats.compilation);
  };

  protected async lint(compilation: Plugin.BaseCompilation) {
    const options = this.options ?? {};
    const linter = new Linter(options.linter);
    const result = await linter.validate(this.sdk.getRuleContext({}));
    const validateErrors = result.errors.map((err) =>
      DevToolError.from(err, {
        detail: err.detail,
        controller: {
          noColor: true,
        },
      }),
    );

    const errors = validateErrors.filter((item) => item.level === 'Error');
    const warnings = validateErrors.filter((item) => item.level === 'Warn');
    const toWebpackError = (err: DevToolError) =>
      err.toError() as unknown as WebpackError;

    result.replace.forEach((item) => {
      if (isArray(compilation.errors) && compilation.errors.includes(item)) {
        pull(compilation.errors, item);
      }
      if (
        isArray(compilation.warnings) &&
        compilation.warnings.includes(item)
      ) {
        pull(compilation.warnings, item);
      }
    });

    if (isArray(compilation.errors)) {
      errors.forEach((err) => {
        compilation.warnings.push(toWebpackError(err));
      });
    }

    if (isArray(compilation.warnings)) {
      warnings.forEach((err) => {
        compilation.warnings.push(toWebpackError(err));
      });
    }

    this.sdk.reportError(validateErrors);

    await linter.afterValidate({
      data: this.sdk.getRuleContext({}),
      validateResult: result,
      hooks: {
        afterSaveManifest: this.sdk.hooks.afterSaveManifest,
      },
    });
  }
}
