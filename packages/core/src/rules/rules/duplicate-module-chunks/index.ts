import { Linter, Rule } from '@rsdoctor/types';
import { Config } from './types';
import { defineRule } from '../../rule';

export type { Config, CheckVersion } from './types';

const title = 'package-duplicate-chunks';

export const rule = defineRule<typeof title, Config>(() => ({
  meta: {
    code: 'E1005',
    title,
    category: 'bundle',
    severity: 'Warn',
    defaultConfig: {
      checkVersion: 'major',
      ignore: [],
    },
  },
  check({ packageGraph, report }) {
    const packages = packageGraph
      .getPackages()
      .filter((pkg) => pkg.duplicates.length > 0);

    for (const pkg of packages) {
      const detail: Linter.ReportDetailData<Rule.duplicatePackageRuleStoreData> =
        {
          type: 'package-duplicate-chunks',
          packages: pkg.duplicates,
        };

      report({
        message: '',
        detail,
      });
    }
  },
}));
