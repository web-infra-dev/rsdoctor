import { Common, Manifest, Plugin, SDK } from '@rsdoctor/types';
import { PackageGraph } from '@rsdoctor/graph';
import { Chunks, ModuleGraphTrans } from '@rsdoctor/graph';
import { isArray } from 'lodash-es';

export function isRspackStats(
  json: Common.PlainObject,
): json is Plugin.StatsCompilation {
  return isArray(json.assets) && isArray(json.chunks);
}

export async function loadRspackStats(
  jsons: Plugin.StatsCompilation[],
): Promise<Manifest.RsdoctorManifest[]> {
  const res = await Promise.all(
    jsons.map(async (json) => {
      const chunkGraph = Chunks.chunkTransform(new Map(), json);
      const moduleGraph = ModuleGraphTrans.getModuleGraphByStats(
        json,
        '.',
        chunkGraph,
      );
      await Chunks.getAssetsModulesData(
        moduleGraph,
        chunkGraph,
        json.outputPath || '',
        {},
        undefined,
      );
      const pkgGraph = PackageGraph.fromModuleGraph(moduleGraph, '.');

      return {
        hash: json.hash || '',
        moduleGraph: await moduleGraph.toData(),
        chunkGraph: chunkGraph.toData(SDK.ToDataType.Normal),
        packageGraph: pkgGraph.toData(),
      } as Pick<
        SDK.StoreData,
        'moduleGraph' | 'chunkGraph' | 'hash' | 'packageGraph'
      >;
    }),
  );

  return res.map((e) => {
    return {
      client: {
        enableRoutes: [],
      },
      data: {
        pid: 0,
        root: '',
        errors: [],
        configs: [],
        plugin: {},
        summary: {
          costs: [],
        },
        envinfo: {} as SDK.EnvInfo,
        resolver: [],
        loader: [],
        moduleCodeMap: {},
        ...e,
      },
    };
  });
}
