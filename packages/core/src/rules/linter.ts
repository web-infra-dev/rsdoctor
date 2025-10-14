import { Linter as LinterType, SDK } from '@rsdoctor/types';
import { Rule } from './rule';
import { rules as allRules } from './rules';
import { toSeverity } from './utils';
import { DynamicRuleLoader } from './dynamic-loader';

export { LinterType };

export class Linter<Rules extends LinterType.ExtendRuleData[]> {
  private rules: Rule<any>[] = [];
  private dynamicLoader?: DynamicRuleLoader;
  private dynamicRules?: LinterType.DynamicRuleLoaderOptions;
  private initialized = false;

  constructor({
    rules,
    extends: extendRules,
    level,
    dynamicRules,
  }: LinterType.Options<Rules> & {
    dynamicRules?: LinterType.DynamicRuleLoaderOptions;
  } = {}) {
    this.dynamicRules = dynamicRules;
    this.rules = this.getRulesSync(
      rules ?? {},
      extendRules ?? [],
      toSeverity(level ?? 'Error', LinterType.Severity.Error),
    );
  }

  private getRulesSync(
    ruleMap: LinterType.InferRulesConfig<Rules>,
    extendRules: LinterType.ExtendRuleData[],
    filterLevel: LinterType.Severity,
  ) {
    const outside = extendRules.map((item) => Rule.from(item));
    const rules = allRules
      .map((item) => new Rule<LinterType.DefaultRuleConfig>(item))
      .concat(outside);

    rules.forEach((rule) => {
      if (ruleMap[rule.title]) {
        rule.setOption(ruleMap[rule.title]);
      }
    });

    return rules.filter((rule) => rule.match(filterLevel));
  }

  private async loadDynamicRules() {
    if (this.initialized || !this.dynamicRules?.packages?.length) {
      return;
    }

    this.dynamicLoader = new DynamicRuleLoader(this.dynamicRules);
    try {
      const dynamicResult = await this.dynamicLoader.loadRules();
      const dynamicRuleInstances = dynamicResult.rules.map((item) =>
        Rule.from(item),
      );

      // Apply rule configurations
      dynamicRuleInstances.forEach((rule) => {
        // Apply configurations from dynamicRules.rules if available
        const packageConfig = this.dynamicRules?.packages?.find(
          (pkg) => pkg.rules && pkg.rules[rule.title],
        );
        if (packageConfig?.rules?.[rule.title]) {
          rule.setOption(packageConfig.rules[rule.title]);
        }
      });

      this.rules.push(...dynamicRuleInstances);

      // Log dynamic rule loading results
      if (dynamicResult.errors.length > 0) {
        console.warn(
          'Some dynamic rule packages failed to load:',
          dynamicResult.errors,
        );
      }
    } catch (error) {
      console.warn('Failed to load dynamic rules:', error);
    }

    this.initialized = true;
  }

  async validate(context: SDK.RuntimeContext) {
    // Load dynamic rules before validation
    await this.loadDynamicRules();

    const lintResult: LinterType.ValidateResult = {
      errors: [],
      replace: [],
    };

    await Promise.all(
      this.rules.map(async (rule) => {
        const result = await rule.validate(context);
        lintResult.errors.push(...result.errors);
        lintResult.replace.push(...result.replace);
      }),
    );

    return lintResult;
  }

  async afterValidate(
    context: LinterType.InternalRuleCheckerContextForCheckEnd,
  ) {
    await Promise.all(this.rules.map((rule) => rule.afterValidate(context)));
  }
}
