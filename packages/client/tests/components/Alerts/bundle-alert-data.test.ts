import { describe, expect, it } from 'rstack/test';
import { Rule } from '@rsdoctor/shared/types';
import { groupBundleAlerts } from 'src/components/Alerts/bundle-alert-data';

function createAlert(
  id: string,
  code: Rule.RuleMessageCode,
): Rule.RuleStoreDataItem {
  return {
    id,
    code,
    category: Rule.RuleMessageCategory.Bundle,
    title: id,
    description: id,
    level: 'warn',
    type: 'link',
  };
}

describe('groupBundleAlerts', () => {
  it('keeps overlay errors out of custom rules', () => {
    const builtin = createAlert('builtin', 'E1004');
    const custom = createAlert('custom', Rule.RuleMessageCodeEnumerated.Extend);
    const overlay = createAlert(
      'overlay',
      Rule.RuleMessageCodeEnumerated.Overlay,
    );

    const groups = groupBundleAlerts([builtin, custom, overlay]);

    expect(groups.find(({ key }) => key === 'E1004')?.data).toEqual([builtin]);
    expect(groups.find(({ key }) => key === 'CUSTOM_RULES')?.data).toEqual([
      custom,
    ]);
    expect(groups.flatMap(({ data }) => data)).not.toContain(overlay);
  });
});
