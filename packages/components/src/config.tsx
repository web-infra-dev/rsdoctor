import { createContext } from 'react';
import { Manifest } from '@rsdoctor/types';
import { getLocaleFromStorage, getThemeFromStorage, getViewModeFromStorage } from './utils/storage';
import { PageState, ViewMode, Language, Theme } from './constants';

export interface Config {
  locale: Language;
  theme: Theme;
  pageState: PageState;
  viewMode: {
    bundleAlerts: ViewMode;
    compileAlerts: ViewMode;
  };
  json: Manifest.RsdoctorManifest;
  setTheme(theme: Config['theme']): void;
  setManifest(json: Manifest.RsdoctorManifest): void;
  setPageState(state: PageState): void;
  setViewMode(mode: Partial<Config['viewMode']>, saveStorage?: boolean): void;
}

export const defaultConfig: Config = {
  locale: getLocaleFromStorage(),
  theme: getThemeFromStorage(),
  pageState: PageState.Pending,
  viewMode: getViewModeFromStorage(),
  json: {} as Manifest.RsdoctorManifest,
  setTheme() {},
  setManifest() {},
  setPageState(_state: PageState) {},
  setViewMode() {},
};

export const ConfigContext = createContext<Config>({
  ...defaultConfig,
});
