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
    hexToRgba('#faad14', 0.85), // gold-6
    hexToRgba('#ffc53d', 0.6), // gold-5
    hexToRgba('#ffd666', 0.55), // gold-4
    hexToRgba('#ffe58f', 0.55), // gold-3
    hexToRgba('#fff1b8', 0.55), // gold-2
    hexToRgba('#fffbe6', 0.5), // gold-1
  ],
  purple: [
    hexToRgba('#722ed1', 0.85), // purple-6
    hexToRgba('#9254de', 0.7), // purple-5
    hexToRgba('#b37feb', 0.65), // purple-4
    hexToRgba('#d3adf7', 0.65), // purple-3
    hexToRgba('#efdbff', 0.65), // purple-2
    hexToRgba('#f9f0ff', 0.65), // purple-1
  ],
  cyan: [
    hexToRgba('#36cfc9', 0.85), // cyan-5
    hexToRgba('#5cdbd3', 0.7), // cyan-4
    hexToRgba('#87e8de', 0.65), // cyan-3
    hexToRgba('#b5f5ec', 0.65), // cyan-2
    hexToRgba('#e6fffb', 0.65), // cyan-1
    hexToRgba('#e6fffb', 0.5), // cyan-0
  ],
  green: [
    hexToRgba('#a0d911', 0.85), // lime-6
    hexToRgba('#bae637', 0.7), // lime-5
    hexToRgba('#d3f261', 0.65), // lime-4
    hexToRgba('#eaff8f', 0.65), // lime-3
    hexToRgba('#f4ffb8', 0.65), // lime-2
    hexToRgba('#fcffe6', 0.5), // lime-1
  ],
  blue: [
    hexToRgba('#2f54eb', 0.85), // geekblue-6
    hexToRgba('#597ef7', 0.7), // geekblue-5
    hexToRgba('#85a5ff', 0.65), // geekblue-4
    hexToRgba('#adc6ff', 0.65), // geekblue-3
    hexToRgba('#d6e4ff', 0.65), // geekblue-2
    hexToRgba('#f0f5ff', 0.5), // geekblue-1
  ],
  yellow: [
    hexToRgba('#fadb14', 0.85), // yellow-6
    hexToRgba('#ffec3d', 0.7), // yellow-5
    hexToRgba('#fff566', 0.65), // yellow-4
    hexToRgba('#fffb8f', 0.65), // yellow-3
    hexToRgba('#ffffb8', 0.65), // yellow-2
    hexToRgba('#feffe6', 0.65), // yellow-1
  ],
} as const;

function hexToRgba(hex: string, alpha = 0.65) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type ColorGroup = keyof typeof BUNDLE_ANALYZER_COLORS;
export const COLOR_GROUPS: ColorGroup[] = [
  'cyan',
  'blue',
  'orange',
  'green',
  'yellow',
  'purple',
];
