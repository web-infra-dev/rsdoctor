export enum Theme {
  Light = 'light',
  Dark = 'dark',
}

export enum PageState {
  Success,
  Pending,
  Fail,
}

export enum ComponentState {
  Success,
  Pending,
  Updating,
  Fail,
}

export enum ViewMode {
  List = 'list',
  Group = 'group',
}

export enum Language {
  Cn = 'cn',
  En = 'en',
}

export enum APILoaderMode4Dev {
  Local = 'local',
  Remote = 'remote',
  Default = 'default',
}

export enum Size {
  BasePadding = 20,
  BaseBorderRadius = 8,
  NavBarHeight = 54,
}

export enum Color {
  Red = '#e17055',
  Green = '#52c41a',
  Yellow = '#faad14',
  Blue = '#1677ff',
}

export const drawerWidth =
  // eslint-disable-next-line financial/no-float-calculation
  typeof window === 'undefined'
    ? 0
    : window.innerWidth * 0.85 >= 1100
      ? window.innerWidth * 0.85
      : 1100;

export const TAG_PALLETE = {
  COLOR_A: '#90DCE9',
  COLOR_B: 'green',
  COLOR_C: '#4EAAB9',
  COLOR_D: '#B7E9F4',
  COLOR_E: '#2E7CBE',
  DARK_BLUE: '#1554ad',
};

// export const MAIN_BG = 'linear-gradient(307deg, rgb(255, 255, 255) 0%, rgba(228, 243, 255, 0.56) 100%)';
export const MAIN_BG = '';
export const ROOT_BG_COLOR = 'rgb(105, 177, 255)';
