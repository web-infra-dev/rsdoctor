import type { ExtendRuleData } from './rule';

/**
 * Dynamic rule package metadata
 */
export interface DynamicRulePackageMeta {
  /** Package name */
  name: string;
  /** Package version */
  version: string;
  /** Package description */
  description?: string;
  /** Required rsdoctor version range */
  rsdoctorVersion?: string;
  /** Package dependencies */
  dependencies?: Record<string, string>;
}

/**
 * Dynamic rule package interface
 */
export interface DynamicRulePackage {
  /** Package metadata */
  meta: DynamicRulePackageMeta;
  /** Exported rules */
  rules: ExtendRuleData[];
}

/**
 * Dynamic rule loader configuration
 */
export interface DynamicRuleConfig {
  /** Package name or path */
  package: string;
  /** Version constraint (optional) */
  version?: string;
  /** Whether to enable this package */
  enabled?: boolean;
  /** Custom configuration for rules in this package */
  rules?: Record<string, any>;
}

/**
 * Dynamic rule loader options
 */
export interface DynamicRuleLoaderOptions {
  /** Array of dynamic rule configurations */
  packages?: DynamicRuleConfig[];
  /** Cache directory for downloaded packages */
  cacheDir?: string;
  /** Whether to enable caching */
  enableCache?: boolean;
  /** Custom package resolver */
  resolver?: (packageName: string, version?: string) => Promise<string>;
}

/**
 * Dynamic rule loader result
 */
export interface DynamicRuleLoaderResult {
  /** Successfully loaded packages */
  packages: DynamicRulePackage[];
  /** Failed packages with error information */
  errors: Array<{
    package: string;
    version?: string;
    error: Error;
  }>;
  /** All loaded rules */
  rules: ExtendRuleData[];
}
