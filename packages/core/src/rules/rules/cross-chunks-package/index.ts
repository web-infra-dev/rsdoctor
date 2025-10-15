import { Linter, Rule } from '@rsdoctor/types';
import { Config } from './types';
import { defineRule } from '../../rule';
import { getErrorMsgForDupPckChunks } from './utils';
import uniq from 'lodash/uniq.js';

export type { Config } from './types';

const title = 'cross-chunks-package';

export const rule = defineRule<typeof title, Config>(() => {
  return {
    meta: {
      code: 'E1002' as const,
      title,
      category: 'bundle',
      severity: Linter.Severity.Warn,
      defaultConfig: {
        ignore: [],
      },
    },
    check({ packageGraph, report }) {
      const packages = packageGraph
        .getPackages()
        .filter((pkg) => pkg.duplicates.length > 0);

      for (const pkg of packages) {
        const detail: Linter.ReportDetailData<Rule.CrossChunksPackageRuleStoreData> =
          {
            type: title,
            chunks: pkg.duplicates,
            package: {
              name: pkg.name,
              id: pkg.id,
              size: pkg.getSize(),
              version: pkg.version,
            },
          };

        const chunks: string[] = [];
        pkg.duplicates.forEach((dup) =>
          chunks.push(...dup.chunks.map((ck) => ck.name)),
        );
        const message = getErrorMsgForDupPckChunks(uniq(chunks), pkg.name);

        report({
          message,
          detail,
        });
      }
    },
  };
});
