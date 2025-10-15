export enum Commands {
  Analyze = 'analyze',
  BundleDiff = 'bundle-diff',
  StatsAnalyze = 'stats-analyze',
}

export const pkg: {
  name: string;
  version: string;
  bin: Record<string, string>;
} = require('../package.json');

console.log(pkg.bin);

export const bin = Object.keys(pkg.bin)[0];
