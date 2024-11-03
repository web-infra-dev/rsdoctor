import { Language } from '../constants';

export function getLocale(locale: string): Language {
  const res = locale === 'cn' || locale === 'zh' ? Language.Cn : Language.En;
  return res;
}
