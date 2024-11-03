import type { Config } from '../config';
import { APILoaderMode4Dev, Language, Theme, ViewMode } from '../constants';

enum Keys {
  Namespace = '__RSDOCTOR__STORAGE__',
  Theme = 'THEME',
  Locale = 'LOCALE',
  ViewMode = 'VIEWMODE',
  APILoaderMode4Dev = 'APILOADERMODE_DEV',
  FirstVisit = 'FIRST_VISIT'
}

export function getStorage(key: string): string | null {
  return window.localStorage.getItem(`${Keys.Namespace}${key}`);
}

export function setStorage(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(`${Keys.Namespace}${key}`, value);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export function getThemeFromStorage(): Config['theme'] {
  return (getStorage(Keys.Theme) as Config['theme']) || Theme.Light;
}

export function setThemeToStorage(theme: Config['theme']) {
  setStorage(Keys.Theme, theme);
}

export function getLocaleFromStorage(): Config['locale'] {
  return (getStorage(Keys.Locale) as Config['locale']) || Language.En;
}

export function setLocaleToStorage(locale: Config['locale']) {
  setStorage(Keys.Locale, locale);
}

export function getViewModeFromStorage(): Config['viewMode'] {
  const fallback: Config['viewMode'] = { bundleAlerts: ViewMode.List, compileAlerts: ViewMode.List };
  try {
    const str = getStorage(Keys.ViewMode);
    if (str) {
      return JSON.parse(str) || fallback;
    }
    return fallback;
  } catch (error) {
    return fallback;
  }
}

export function setViewModeToStorage(viewMode: Config['viewMode']) {
  setStorage(Keys.ViewMode, JSON.stringify(viewMode));
}

export function hasViewModeFromStorage(): boolean {
  return !!getStorage(Keys.ViewMode);
}

export function setAPILoaderModeToStorage(mode: APILoaderMode4Dev) {
  setStorage(Keys.APILoaderMode4Dev, mode);
}

export function getAPILoaderModeFromStorage() {
  return getStorage(Keys.APILoaderMode4Dev) || APILoaderMode4Dev.Default;
}

export function getFirstVisitFromStorage() {
  return getStorage(Keys.FirstVisit);
}

export function setFirstVisitToStorage(value: '1') {
  setStorage(Keys.FirstVisit, value);
}
