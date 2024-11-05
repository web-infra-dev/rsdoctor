import cn from 'antd/es/locale/zh_CN';
import en from 'antd/es/locale/en_GB';
import type { Locale } from 'antd/es/locale';
import { Language } from '../constants';

export function getLocale(locale: string): Locale {
  const res = locale === 'cn' || locale === 'zh-CN' ? cn : en;
  return res;
}

export function getLanguage(locale: string): Language {
  const res = locale === 'cn' || locale === 'zh' ? Language.Cn : Language.En;
  return res;
}
