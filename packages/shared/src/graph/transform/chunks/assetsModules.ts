import { gzipSync } from 'node:zlib';
import { SDK } from '../../../types';
import type { ParseBundle } from '../../types/transform';

const timers = new Map<string, number>();

const time = (label: string) => {
  if (!process.env.DEBUG || timers.has(label)) {
    return;
  }
  timers.set(label, Date.now());
};

const timeEnd = (label: string) => {
  if (!process.env.DEBUG) {
    return;
  }
  const start = timers.get(label);
  if (start == null) {
    return;
  }
  console.debug(`Timer '${label}' ended: ${Date.now() - start}ms`);
  timers.delete(label);
};

export async function getAssetsModulesData(
  moduleGraph: SDK.ModuleGraphInstance,
  _chunkGraph: SDK.ChunkGraphInstance,
  _bundleDir: string,
  _opts: {
    parseBundle?: ParseBundle;
  },
  sourceMapSets: Map<string, string> = new Map(),
  _assetsWithoutSourceMap?: Set<string>,
) {
  if (sourceMapSets.size > 0) {
    time(`Start Parse bundle by sourcemap.`);
    for (const [modulePath, codes] of sourceMapSets.entries()) {
      const modules = moduleGraph.getModuleByFile(modulePath);
      let gzipSize = undefined;
      try {
        if (codes && typeof codes === 'string' && codes.length > 0) {
          gzipSize = gzipSync(codes, { level: 9 }).length;
        }
      } catch {
        // Ignore errors
      }
      for (const module of modules) {
        module?.setSize({
          parsedSize: codes.length,
          gzipSize,
        });
        module?.setSource({ parsedSource: codes });
      }
    }
    timeEnd(`Start Parse bundle by sourcemap.`);
  }
}
