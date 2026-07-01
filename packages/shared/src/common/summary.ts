export enum SummaryCostsDataName {
  Bootstrap = 'bootstrap->beforeCompile',
  Compile = 'beforeCompile->afterCompile',
  Done = 'afterCompile->done',
  Minify = 'minify(processAssets)',
}
