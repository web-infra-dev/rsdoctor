export const PALETTE_COLORS = [
  '#F2793D',
  '#F28B24',
  '#F2A200',
  '#F5CC00',
  '#F5E000',
  '#A3D900',
  '#66CC00',
  '#0AC419',
  '#0AC496',
  '#0AC7D1',
  '#00A8E0',
  '#1471F5',
  '#4060FF',
  '#7559FF',
  '#884DFF',
  '#A526FF',
  '#BA39E5',
  '#C700D9',
  '#D900B5',
  '#E50099',
  '#E52E6B',
  '#F24957',
  '#30B2F2',
  '#00BF70',
  '#5959FF',
  '#9F40FF',
  '#528BFF',
];

export enum ChartTypes {
  Bootstrap,
  Compile,
  Done,
  Minify,
  Loader,
  Normal,
}

export const BUNDLE_ANALYZER_COLORS = {
  green: [
    hexToRgba('#32b26a', 0.6),
    hexToRgba('#5fcf92', 0.6),
    hexToRgba('#8ee2b6', 0.8),
    hexToRgba('#b7e1cd', 1),
    hexToRgba('#cdeee0', 1),
    hexToRgba('#e0f7ef', 1),
    hexToRgba('#c8e6d6', 1),
  ],
  blue: [
    hexToRgba('#3498f7', 0.6),
    hexToRgba('#5eb3fa', 0.6),
    hexToRgba('#8ccafc', 0.8),
    hexToRgba('#b3d8f8', 1),
    hexToRgba('#cde6fa', 1),
    hexToRgba('#e0f2fd', 1),
    hexToRgba('#c8e0ef', 1),
  ],
  purple: [
    hexToRgba('#a04ddb', 0.6),
    hexToRgba('#b26ef0', 0.6),
    hexToRgba('#c49ff5', 0.8),
    hexToRgba('#d1b3e6', 1),
    hexToRgba('#e0c8f2', 1),
    hexToRgba('#f0e6fa', 1),
    hexToRgba('#d6c8e6', 1),
  ],
  yellow: [
    hexToRgba('#ffe066', 0.6),
    hexToRgba('#ffec80', 0.6),
    hexToRgba('#fff599', 0.8),
    hexToRgba('#fff9c4', 1),
    hexToRgba('#fffbe0', 1),
    hexToRgba('#fffde7', 1),
    hexToRgba('#f5f2c8', 1),
  ],
  grey: [
    hexToRgba('#7a7a7a', 0.7),
    hexToRgba('#969696', 0.7),
    hexToRgba('#b0b0b0', 0.8),
    hexToRgba('#c8c8c8', 1),
    hexToRgba('#dcdcdc', 1),
    hexToRgba('#ededed', 1),
    hexToRgba('#f7f7f7', 1),
  ],
} as const;

function hexToRgba(hex: string, alpha = 1) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type ColorGroup = keyof typeof BUNDLE_ANALYZER_COLORS;
export const COLOR_GROUPS: ColorGroup[] = [
  'blue',
  'purple',
  'yellow',
  'grey',
  'green',
];
