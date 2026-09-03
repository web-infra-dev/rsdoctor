import { Rule } from '@rsdoctor/shared/types';

export interface BundleAlertGroup {
  key: string;
  label: string;
  data: Rule.RuleStoreDataItem[];
  tag: string;
}

const BUILTIN_RULE_TABS = [
  { key: 'E1001', label: 'Duplicate Packages' },
  { key: 'E1002', label: 'Cross Chunks Package' },
  { key: 'E1003', label: 'Loader Performance Optimization' },
  { key: 'E1004', label: 'ECMA Version Check' },
  { key: 'E1005', label: 'Default Import Check' },
  { key: 'E1006', label: 'Module Mixed Chunks' },
  { key: 'E1007', label: 'Tree Shaking Side Effects Only' },
  { key: 'E1008', label: 'CJS Require Cannot Tree-Shake' },
  { key: 'E1009', label: 'ESM Import Resolved to CJS' },
];

export function groupBundleAlerts(
  dataSource: Rule.RuleStoreDataItem[],
): BundleAlertGroup[] {
  const groups: BundleAlertGroup[] = BUILTIN_RULE_TABS.map((tab) => ({
    ...tab,
    data: [],
    tag: tab.key,
  }));
  const customRules: Rule.RuleStoreDataItem[] = [];

  dataSource.forEach((alert) => {
    const group = groups.find(({ key }) => key === alert.code);
    if (group) {
      group.data.push(alert);
    } else if (alert.code === Rule.RuleMessageCodeEnumerated.Extend) {
      customRules.push(alert);
    }
  });

  if (customRules.length) {
    groups.push({
      key: 'CUSTOM_RULES',
      label: 'Custom Rules',
      data: customRules,
      tag: 'Custom',
    });
  }

  return groups;
}
