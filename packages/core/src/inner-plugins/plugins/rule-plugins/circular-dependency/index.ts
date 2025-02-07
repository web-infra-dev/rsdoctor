import path from 'path';
let extend = require('util')._extend;

let BASE_ERROR = 'Circular dependency detected:\r\n'
let PluginTitle = 'CircularDependencyPlugin'


/**
 * The following code is based on
 * https://github.com/aackerman/circular-dependency-plugin/blob/master/index.js
 *
 *
 * ISC Licensed
 * Author aackerman
 * Copyright (c) 2016, Aaron Ackerman <theron17@gmail.com>.
 * https://github.com/aackerman/circular-dependency-plugin/blob/master/LICENSE
 */
export class CircularDependencyPlugin {
  options: {
    exclude: RegExp;
    include: RegExp;
    failOnError: boolean;
    allowAsyncCycles: boolean;
    onDetected?: (data: { module: any; paths: string[]; compilation: any }) => void;
    onStart?: (data: { compilation: any }) => void;
    onEnd?: (data: { compilation: any }) => void;
    cwd: string;
  };

  constructor(options: Partial<typeof this.options>) {
    this.options = extend({
      exclude: new RegExp('$^'),
      include: new RegExp('.*'),
      failOnError: false,
      allowAsyncCycles: false,
      onDetected: false,
      cwd: process.cwd()
    }, options);
  }

  apply(compiler: any) {
    let plugin = this;

    compiler.hooks.compilation.tap(PluginTitle, (compilation: any) => {
      compilation.hooks.optimizeModules.tap(PluginTitle, (modules: any[]) => {
        if (plugin.options.onStart) {
          plugin.options.onStart({ compilation });
        }
        for (let module of modules) {
          const shouldSkip = (
            module.resource == null ||
            plugin.options.exclude.test(module.resource) ||
            !plugin.options.include.test(module.resource)
          );
          // skip the module if it matches the exclude pattern
          if (shouldSkip) {
            continue;
          }

          let maybeCyclicalPathsList = this.isCyclic(module, module, {}, compilation);
          if (maybeCyclicalPathsList) {
            // allow consumers to override all behavior with onDetected
            if (plugin.options.onDetected) {
              try {
                if (Array.isArray(maybeCyclicalPathsList)) {
                  plugin.options.onDetected({
                    module: module,
                    paths: maybeCyclicalPathsList,
                    compilation: compilation
                  });
                }
              } catch(err) {
                compilation.errors.push(err);
              }
              continue;
            }

            // mark warnings or errors on webpack compilation
            let error = maybeCyclicalPathsList && typeof maybeCyclicalPathsList === 'object' && maybeCyclicalPathsList.length && new Error(BASE_ERROR.concat(maybeCyclicalPathsList.join(' -> ')));
            if (plugin.options.failOnError) {
              compilation.errors.push(error);
            } else {
              compilation.warnings.push(error);
            }
          }
        }
        if (plugin.options.onEnd) {
          plugin.options.onEnd({ compilation });
        }
      });
    });
  }

  isCyclic(initialModule: any, currentModule: any, seenModules: { [key: string]: boolean }, compilation: any): string[] | undefined | boolean {
    let cwd = this.options.cwd;

    // Add the current module to the seen modules cache
    seenModules[currentModule.debugId] = true;

    // If the modules aren't associated to resources
    // it's not possible to display how they are cyclical
    if (!currentModule.resource || !initialModule.resource) {
      return false;
    }

    // Iterate over the current modules dependencies
    for (let dependency of currentModule.dependencies) {
      if (
        dependency.constructor &&
        dependency.constructor.name === 'CommonJsSelfReferenceDependency'
      ) {
        continue;
      }

      let depModule: any = null;
      if (compilation.moduleGraph) {
        // handle getting a module for webpack 5
        depModule = compilation.moduleGraph.getModule(dependency);
      } else {
        // handle getting a module for webpack 4
        depModule = dependency.module;
      }

      if (!depModule) { continue; }
      // ignore dependencies that don't have an associated resource
      if (!depModule.resource) { continue; }
      // ignore dependencies that are resolved asynchronously
      if (this.options.allowAsyncCycles && dependency.weak) { continue; }
      // the dependency was resolved to the current module due to how webpack internals
      // setup dependencies like CommonJsSelfReferenceDependency and ModuleDecoratorDependency
      if (currentModule === depModule) {
        continue;
      }

      if (depModule.debugId in seenModules) {
        if (depModule.debugId === initialModule.debugId) {
          // Initial module has a circular dependency
          return [
            path.relative(cwd, currentModule.resource),
            path.relative(cwd, depModule.resource)
          ];
        }
        // Found a cycle, but not for this module
        continue;
      }

      let maybeCyclicalPathsList: any = this.isCyclic(initialModule, depModule, seenModules, compilation);
      if (maybeCyclicalPathsList) {
        maybeCyclicalPathsList.unshift(path.relative(cwd, currentModule.resource));
        return maybeCyclicalPathsList;
      }
    }

    return false;
  }
}