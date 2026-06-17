import type { ECMAVersion } from '@rsdoctor/core/rule-utils';

export function getVersionNumber(ECMAString: ECMAVersion) {
  const version = ECMAString.match(/\d/);

  return version?.length ? Number(version[0]) : undefined;
}
