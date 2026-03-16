import { rule as duplicatePackage } from './duplicate-package';
import { rule as defaultImportCheck } from './default-import-check';
import { rule as loaderPerformanceOptimization } from './loader-performance-optimization';
import { rule as ecmaVersionCheck } from './ecma-version-check';
import { rule as crossChunksPackage } from './cross-chunks-package';
import { rule as moduleMixedChunks } from './module-mixed-chunks';
import { rule as connectionsOnlyImports } from './side-effects-only-imports';
import { rule as cjsRequire } from './cjs-require';
import { rule as esmImportCjs } from './esm-import-cjs';

export const rules = [
  duplicatePackage,
  defaultImportCheck,
  loaderPerformanceOptimization,
  ecmaVersionCheck,
  crossChunksPackage,
  moduleMixedChunks,
  connectionsOnlyImports,
  cjsRequire,
  esmImportCjs,
];
