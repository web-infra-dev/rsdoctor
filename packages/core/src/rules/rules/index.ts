import { rule as duplicatePackage } from './duplicate-package';
import { rule as defaultImportCheck } from './default-import-check';
import { rule as loaderPerformanceOptimization } from './loader-performance-optimization';
import { rule as ecmaVersionCheck } from './ecma-version-check';
import { rule as crossChunksPackage } from './cross-chunks-package';

export const rules = [
  duplicatePackage,
  defaultImportCheck,
  loaderPerformanceOptimization,
  ecmaVersionCheck,
  crossChunksPackage,
];
