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
  orange: [
    hexToRgba('#FF6B6B', 0.7),
    hexToRgba('#FF8E8E', 0.7),
    hexToRgba('#FFB3B3', 0.8),
    hexToRgba('#FFD4D4', 0.9),
    hexToRgba('#FFE8E8', 1),
    hexToRgba('#FFF0F0', 1),
    hexToRgba('#FFF5F5', 1),
  ],
  purple: [
    hexToRgba('#9B59B6', 0.7),
    hexToRgba('#BB8FCE', 0.7),
    hexToRgba('#D7BDE2', 0.8),
    hexToRgba('#E8DAEF', 0.9),
    hexToRgba('#F4ECF7', 1),
    hexToRgba('#F9F4FA', 1),
    hexToRgba('#FDF2FD', 1),
  ],
  blue: [
    hexToRgba('#3498DB', 0.7),
    hexToRgba('#5DADE2', 0.7),
    hexToRgba('#85C1E2', 0.8),
    hexToRgba('#AED6F1', 0.9),
    hexToRgba('#D6EAF8', 1),
    hexToRgba('#EBF5FB', 1),
    hexToRgba('#F4F8FC', 1),
  ],
  green: [
    hexToRgba('#2ECC71', 0.7),
    hexToRgba('#58D68D', 0.7),
    hexToRgba('#82E0AA', 0.8),
    hexToRgba('#ABEBC6', 0.9),
    hexToRgba('#D5F4E6', 1),
    hexToRgba('#EAFAF1', 1),
    hexToRgba('#F4FDF7', 1),
  ],
  teal: [
    hexToRgba('#1ABC9C', 0.7),
    hexToRgba('#48C9B0', 0.7),
    hexToRgba('#76D7C4', 0.8),
    hexToRgba('#A3E4D7', 0.9),
    hexToRgba('#D1F2EB', 1),
    hexToRgba('#E8F8F5', 1),
    hexToRgba('#F4FCFA', 1),
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
  'orange',
  'purple',
  'blue',
  'green',
  'teal',
  'grey',
];
