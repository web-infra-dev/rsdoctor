import {
  DynamicRuleLoaderOptions,
  DynamicRuleLoaderResult,
  DynamicRulePackage,
} from '@rsdoctor/types';
import { logger } from '@rsdoctor/utils/logger';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { createRequire } from 'module';

/**
 * Dynamic rule loader for loading rules from npm packages
 */
export class DynamicRuleLoader {
  private options: Required<DynamicRuleLoaderOptions>;
  private cache = new Map<string, DynamicRulePackage>();

  constructor(options: DynamicRuleLoaderOptions = {}) {
    this.options = {
      packages: options.packages || [],
      cacheDir: options.cacheDir || join(process.cwd(), '.rsdoctor', 'cache'),
      enableCache: options.enableCache ?? true,
      resolver: options.resolver || this.defaultResolver.bind(this),
    };

    // Ensure cache directory exists
    if (this.options.enableCache && !existsSync(this.options.cacheDir)) {
      mkdirSync(this.options.cacheDir, { recursive: true });
    }
  }

  /**
   * Load all dynamic rules
   */
  async loadRules(): Promise<DynamicRuleLoaderResult> {
    const result: DynamicRuleLoaderResult = {
      packages: [],
      errors: [],
      rules: [],
    };

    for (const config of this.options.packages) {
      if (config.enabled === false) {
        continue;
      }

      try {
        const packagePath = await this.options.resolver(
          config.package,
          config.version,
        );
        const rulePackage = await this.loadPackage(packagePath, config);

        result.packages.push(rulePackage);
        result.rules.push(...rulePackage.rules);

        logger.info(
          `Successfully loaded dynamic rules from ${config.package}@${rulePackage.meta.version}`,
        );
      } catch (error) {
        result.errors.push({
          package: config.package,
          version: config.version,
          error: error as Error,
        });

        logger.error(
          `Failed to load dynamic rules from ${config.package}:`,
          error,
        );
      }
    }

    return result;
  }

  /**
   * Load a single package
   */
  private async loadPackage(
    packagePath: string,
    config: any,
  ): Promise<DynamicRulePackage> {
    const cacheKey = `${config.package}@${config.version || 'latest'}`;

    // Check cache first
    if (this.options.enableCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Load package.json to get metadata
    const packageJsonPath = join(packagePath, 'package.json');
    if (!existsSync(packageJsonPath)) {
      throw new Error(`Package.json not found in ${packagePath}`);
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    // Load rules from the package
    const rules = await this.loadPackageRules(packagePath, config);

    const rulePackage: DynamicRulePackage = {
      meta: {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description,
        rsdoctorVersion: packageJson.peerDependencies?.['@rsdoctor/core'],
        dependencies: packageJson.dependencies,
      },
      rules,
    };

    // Cache the result
    if (this.options.enableCache) {
      this.cache.set(cacheKey, rulePackage);
    }

    return rulePackage;
  }

  /**
   * Load rules from a package
   */
  private async loadPackageRules(
    packagePath: string,
    config: any,
  ): Promise<any[]> {
    // Try to load from main entry point
    const mainEntry = this.getPackageMainEntry(packagePath);
    if (!mainEntry) {
      throw new Error(`No main entry point found in package ${packagePath}`);
    }

    const require = createRequire(import.meta.url);
    const packageModule = require(mainEntry);

    // Extract rules from the package
    let rules: any[] = [];

    if (packageModule.rules && Array.isArray(packageModule.rules)) {
      rules = packageModule.rules;
    } else if (packageModule.default && packageModule.default.rules) {
      rules = packageModule.default.rules;
    } else if (Array.isArray(packageModule)) {
      rules = packageModule;
    } else {
      throw new Error(`Invalid rule package format in ${packagePath}`);
    }

    // Apply custom configuration if provided
    if (config.rules) {
      rules = rules.map((rule) => {
        const ruleConfig = config.rules[rule.meta?.title];
        if (ruleConfig) {
          return {
            ...rule,
            meta: {
              ...rule.meta,
              ...ruleConfig,
            },
          };
        }
        return rule;
      });
    }

    return rules;
  }

  /**
   * Get package main entry point
   */
  private getPackageMainEntry(packagePath: string): string | null {
    const packageJsonPath = join(packagePath, 'package.json');
    if (!existsSync(packageJsonPath)) {
      return null;
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    // Try different entry points
    const possibleEntries = [
      packageJson.main,
      packageJson.module,
      packageJson.exports?.['.']?.import,
      packageJson.exports?.['.']?.require,
      'index.js',
      'index.cjs',
      'index.mjs',
    ].filter(Boolean);

    for (const entry of possibleEntries) {
      const entryPath = join(packagePath, entry);
      if (existsSync(entryPath)) {
        return entryPath;
      }
    }

    return null;
  }

  /**
   * Default package resolver
   */
  private async defaultResolver(
    packageName: string,
    version?: string,
  ): Promise<string> {
    // For local packages (relative paths)
    if (packageName.startsWith('./') || packageName.startsWith('../')) {
      const resolvedPath = join(process.cwd(), packageName);
      if (existsSync(resolvedPath)) {
        return resolvedPath;
      }
      throw new Error(`Local package not found: ${packageName}`);
    }

    // For npm packages, try to resolve from node_modules
    try {
      const require = createRequire(import.meta.url);
      const packagePath = require.resolve(packageName);
      return dirname(packagePath);
    } catch (error) {
      throw new Error(
        `Package not found: ${packageName}${version ? `@${version}` : ''}`,
      );
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
