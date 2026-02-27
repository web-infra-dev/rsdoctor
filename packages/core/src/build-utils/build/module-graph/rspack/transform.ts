import {
  Dependency,
  extractCodeFromLocation,
  Module,
  parseLocation,
} from '@rsdoctor/graph';
import { Plugin, SDK } from '@rsdoctor/types';

/**
 * Create dependency kind from dependency type string
 * @param type The dependency type string from Rspack
 * @returns The normalized dependency kind
 */
const createDependencyKind = (type: string) => {
  if (type.includes('harmony')) {
    return SDK.DependencyKind.ImportStatement;
  }
  if (type.includes('cjs')) {
    return SDK.DependencyKind.RequireCall;
  }
  if (type.includes('import()')) {
    return SDK.DependencyKind.DynamicImport;
  }
  if (type.includes('amd')) {
    return SDK.DependencyKind.AMDRequire;
  }
  return SDK.DependencyKind.Unknown;
};

/**
 * Patch native module graph data from Rspack into ModuleGraph instance
 * @param mg The ModuleGraph instance to be patched
 * @param cg The ChunkGraph instance to be patched
 * @param rawModuleGraph Raw module graph data from Rspack native plugin
 */
export function patchNativeModuleGraph(
  mg: SDK.ModuleGraphInstance,
  cg: SDK.ChunkGraphInstance,
  rawModuleGraph: Plugin.RspackNativeModuleGraph,
) {
  const {
    modules: rawModules,
    dependencies: rawDependencies,
    chunkModules: rawChunkModules,
  } = rawModuleGraph;
  /** set modules */
  const modules = rawModules.map((module) => {
    const res = new Module(
      module.identifier,
      module.path,
      module.isEntry,
      module.kind === 'concatenated'
        ? SDK.ModuleKind.Concatenation
        : SDK.ModuleKind.Normal,
      undefined,
      module.layer,
    );
    res.setId(module.ukey);
    return res;
  });
  mg.setModules(modules);
  /** set module imported */
  for (const rawModule of rawModules) {
    const module = mg.getModuleById(rawModule.ukey);
    if (module) {
      module.setImported(
        rawModule.imported
          .map((ukey) => mg.getModuleById(ukey)!)
          .filter(Boolean),
      );
    }
  }
  /** set module concatenated children modules */
  for (const rawModule of rawModules) {
    const module = mg.getModuleById(rawModule.ukey)!;
    module.setModules(
      rawModule.modules.map((ukey) => mg.getModuleById(ukey)!).filter(Boolean),
    );
  }
  /** set module concatenated parent modules */
  for (const rawModule of rawModules) {
    const module = mg.getModuleById(rawModule.ukey);
    if (module) {
      module.setConcatenationModules(
        rawModule.belongModules
          .map((ukey) => mg.getModuleById(ukey)!)
          .filter(Boolean),
      );
    }
  }
  /** set module chunks */
  for (const rawModule of rawModules) {
    const module = mg.getModuleById(rawModule.ukey);
    if (module) {
      module.setChunks(
        rawModule.chunks
          .map((ukey) => cg.getChunkById(ukey.toString())!)
          .filter(Boolean),
      );
    }
  }
  /** set chunk modules */
  for (const rawChunkModule of rawChunkModules) {
    const chunk = cg.getChunkById(rawChunkModule.chunk.toString());
    if (chunk) {
      chunk.setModules(
        rawChunkModule.modules
          .map((ukey) => mg.getModuleById(ukey)!)
          .filter(Boolean),
      );
    }
  }
  /** set dependencies */
  const deppendencies = rawDependencies.map((dep) => {
    const res = new Dependency(
      dep.request,
      mg.getModuleById(dep.module)!,
      mg.getModuleById(dep.dependency)!,
      createDependencyKind(dep.kind),
    );
    res.setId(dep.ukey);
    return res;
  });
  mg.setDependencies(deppendencies);

  /** set module dependencies、bailoutReason and sideEffectLocations */
  for (const rawModule of rawModules) {
    const module = mg.getModuleById(rawModule.ukey)!;
    module.setDependencies(
      rawModule.dependencies
        .map((ukey) => mg.getDependencyById(ukey)!)
        .filter(Boolean),
    );
    if (module && rawModule.bailoutReason) {
      rawModule.bailoutReason
        .filter((reason) => !reason.includes('ModuleConcatenation bailout'))
        .forEach((reason) => module.addBailoutReason(reason));
    }
    if (
      module &&
      'sideEffectsLocations' in rawModule &&
      Array.isArray(rawModule.sideEffectsLocations) &&
      rawModule.sideEffectsLocations.length
    ) {
      rawModule.sideEffectsLocations.forEach((item: any) => {
        module.addSideEffectLocation({
          location: item.location,
          nodeType: item.nodeType,
          module: item.module,
          request: item.request,
        });
      });
    }
  }
}

/**
 * Patch native ids data from Rspack into ModuleGraph instance
 * @param mg The ModuleGraph instance to be patched
 * @param rawModuleIdsPatch Raw ids patch data from Rspack native plugin
 */
export function patchNativeModuleIds(
  mg: SDK.ModuleGraphInstance,
  rawModuleIdsPatch: Plugin.RspackNativeModuleIdsPatch,
) {
  const { moduleIds: rawModuleIds } = rawModuleIdsPatch;
  /** set module ids */
  for (const rawModuleId of rawModuleIds) {
    const module = mg.getModuleById(rawModuleId.module);
    if (module) {
      module.setRenderId(rawModuleId.renderId);
    }
  }
}

/**
 * Patch native sources data from Rspack into ModuleGraph instance
 * @param mg The ModuleGraph instance to be patched
 * @param rawModuleIdsPatch Raw sources patch data from Rspack native plugin
 */
export function patchNativeModuleSources(
  mg: SDK.ModuleGraphInstance,
  rawModuleSourcesPatch: Plugin.RspackNativeModuleSourcePatch,
) {
  const { moduleOriginalSources: rawModuleOriginalSources } =
    rawModuleSourcesPatch;
  /** set module original sources */
  for (const rawModuleOriginalSource of rawModuleOriginalSources) {
    const module = mg.getModuleById(rawModuleOriginalSource.module);
    if (module) {
      module.setSource({
        source: rawModuleOriginalSource.source,
      });
      module.setSize({
        sourceSize: rawModuleOriginalSource.size,
      });
    }
  }
}

/**
 * Extract and store code snippets for side effect locations
 * This should be called after module sources have been set
 * @param mg The ModuleGraph instance with modules and side effect locations
 */
export function extractSideEffectCodes(mg: SDK.ModuleGraphInstance) {
  const modules = mg.getModules();
  for (const module of modules) {
    const sideEffectLocations = module.getSideEffectLocations();
    if (!sideEffectLocations.length) continue;

    // Get the module source code
    const moduleSource = module.getSource();
    const source = moduleSource.source || moduleSource.parsedSource;
    if (!source) continue;

    // Process each side effect location
    for (const sideEffectLocation of sideEffectLocations) {
      // Parse the location string
      const parsedLocation = parseLocation(sideEffectLocation.location);
      if (!parsedLocation) continue;

      // Extract the code snippet
      const code = extractCodeFromLocation(source, parsedLocation);
      if (code) {
        // Store the code in a separate data structure
        module.addSideEffectCode({
          moduleId: module.id,
          startLine: parsedLocation.startLine,
          code,
        });
      }
    }
  }
}
