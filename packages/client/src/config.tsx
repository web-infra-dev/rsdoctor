import { createContext } from 'react';
import { Manifest } from '@rsdoctor/shared/types';
import { getThemeFromStorage, getViewModeFromStorage } from './utils/storage';
import { PageState, ViewMode, Theme } from './constants';

export interface Config {
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
  // whether the page is embedded in another page
  embedded?: boolean;
}

export const defaultConfig: Config = {
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
