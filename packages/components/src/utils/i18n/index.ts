import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';


import en from './en';
import cn from './cn';
import { getLocaleFromStorage } from '../storage';

i18n
  .use(initReactI18next)
  .init({
    lng: getLocaleFromStorage(),
    // we init with resources
    resources: {
      en: {
        translations: en,
      },
      cn: {
        translations: cn,
      },
    },
    fallbackLng: {
      'zh-CN': ['cn'],
      default: ['en'],
    },
    debug: process.env.NODE_ENV === 'development',

    // have a common namespace used around the full app
    ns: ['translations'],
    defaultNS: 'translations',

    keySeparator: false, // we use content as keys

    interpolation: {
      escapeValue: false,
    },
  });
  
export default i18n