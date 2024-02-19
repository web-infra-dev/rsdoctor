export enum Commands {
  Analyze = 'analyze',
}

export const pkg: {
  name: string;
  version: string;
  bin: Record<string, string>;
} = require('../package.json');

export const bin = Object.keys(pkg.bin)[0];
