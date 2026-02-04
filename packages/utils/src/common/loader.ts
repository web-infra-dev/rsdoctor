import { SDK } from '@rsdoctor/types';
import { mergeIntervals } from './algorithm';
import { Plugin } from '@rsdoctor/types';

export function findLoaderTotalTiming(
  loaders: Pick<SDK.LoaderTransformData, 'startAt' | 'endAt'>[],
) {
  let start = Infinity;
  let end = -Infinity;

  for (let i = 0; i < loaders.length; i++) {
    const loader = loaders[i];

    if (loader.startAt <= start) {
      start = loader.startAt;
    }

    if (loader.endAt >= end) {
      end = loader.endAt;
    }
  }

  return {
    start,
    end,
  };
}

export function getLoadersCosts(
  filter: (
    loader: Pick<
      SDK.LoaderTransformData,
      'loader' | 'startAt' | 'endAt' | 'pid'
    >,
  ) => boolean,
  loaders: Pick<
    SDK.LoaderTransformData,
    'loader' | 'startAt' | 'endAt' | 'pid'
  >[],
) {
  const match: { [pid: number | string]: [start: number, end: number][] } = {};
  const others: { [pid: number | string]: [start: number, end: number][] } = {};

  loaders.forEach((e) => {
    if (filter(e)) {
      if (!match[e.pid]) match[e.pid] = [];
      match[e.pid].push([e.startAt, e.endAt]);
    } else {
      if (!others[e.pid]) others[e.pid] = [];
      others[e.pid].push([e.startAt, e.endAt]);
    }
  });

  let costs = 0;

  const pids = Object.keys(match);

  for (let i = 0; i < pids.length; i++) {
    const pid = pids[i];
    const _match = mergeIntervals(match[pid]);
    // between in loader.startAt and loader.endAt
    const _others = mergeIntervals(others[pid] || []).filter(([s, e]) =>
      _match.some((el) => s >= el[0] && e <= el[1]),
    );

    const matchSum = _match.length
      ? _match.reduce((t, c) => (t += c[1] - c[0]), 0)
      : 0;
    const othersSum = _others.length
      ? _others.reduce((t, c) => (t += c[1] - c[0]), 0)
      : 0;

    costs += matchSum - othersSum;
  }

  return costs;
}

export function getLoaderCosts(
  loader: SDK.LoaderTransformData,
  loaders: SDK.LoaderTransformData[],
) {
  // between in target loader.startAt and loader.endAt
  const blocked = loaders.filter((e) => {
    // TODO: Because the loader on the rust side adopts multi-threading, it is necessary to discuss the thread worker ID to make the accuracy of the cold resistance time.
    if (e.loader.includes('builtin')) {
      return false;
    }
    if (e !== loader && e.pid === loader.pid) {
      if (e.startAt >= loader.startAt) {
        // |------|
        //   |--|
        if (e.endAt <= loader.endAt) return true;

        // |------|
        //      |---|
        // if (e.startAt < loader.endAt) return true;
      }

      //  |-------|
      // |---|
      // if (e.endAt > loader.startAt && e.endAt < loader.endAt) return true;
    }

    return false;
  });

  let costs = loader.endAt - loader.startAt;

  if (blocked.length) {
    const intervals: [number, number][] = blocked.map((e) => [
      Math.max(e.startAt, loader.startAt),
      Math.min(e.endAt, loader.endAt),
    ]);

    mergeIntervals(intervals).forEach((e) => {
      const sub = e[1] - e[0];
      costs -= sub;
    });
  }

  return costs;
}

export function getLoaderNames(
  loaders: SDK.LoaderData,
): SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetLoaderNames> {
  const names: Set<string> = new Set();

  loaders.forEach((e) =>
    e.loaders.forEach((l) => names.add(getLoadrName(l.loader))),
  );

  return [...names];
}

export function getLoadersTransformData(loaders: SDK.LoaderData) {
  const res: SDK.LoaderTransformData[] = [];

  for (let i = 0; i < loaders.length; i++) {
    const item = loaders[i];
    for (let j = 0; j < item.loaders.length; j++) {
      const loader = item.loaders[j];
      res.push(loader);
    }
  }
  return res;
}

export function getLoaderChartData(
  loaders: SDK.LoaderData,
): SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetLoaderChartData> {
  const res: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetLoaderChartData> =
    [];
  const list = getLoadersTransformData(loaders);

  loaders.forEach((item) => {
    item.loaders.forEach((el) => {
      res.push({
        layer: item.resource.layer,
        loader: getLoadrName(el.loader),
        isPitch: el.isPitch,
        startAt: el.startAt,
        endAt: el.endAt,
        pid: el.pid,
        sync: el.sync,
        resource: item.resource.path,
        costs: getLoaderCosts(el, list),
      });
    });
  });

  return res;
}

export function getLoaderFileTree(
  loaders: SDK.LoaderData,
): SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetLoaderFileTree> {
  const list = getLoadersTransformData(loaders);
  return loaders.map((data) => {
    const { loaders: arr, resource } = data;
    return {
      path: resource.path,
      layer: resource.layer,
      loaders: arr.map((l) => {
        return {
          key: l.path,
          loader: getLoadrName(l.loader),
          path: l.path,
          errors: l.errors,
          costs: getLoaderCosts(l, list),
        };
      }),
    };
  });
}

export function getLoaderFileDetails(
  path: string,
  loaders: SDK.LoaderData,
): SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetLoaderFileDetails> {
  const data = loaders.find((e) => e.resource.path === path);

  if (!data) {
    throw new Error(`"${path}" not match any loader data`);
  }

  const list = getLoadersTransformData(loaders);

  return {
    ...data,
    loaders: data.loaders.map((el) => {
      // Strip large input/result fields to reduce data volume
      // These can be fetched on-demand via GetLoaderFileInputAndOutput API
      const { input, result, ...loaderWithoutCode } = el;
      return {
        ...loaderWithoutCode,
        loader: getLoadrName(el.loader),
        costs: getLoaderCosts(el, list),
      };
    }),
  };
}

export function getLoaderFolderStatistics(
  folder: string,
  loaders: SDK.LoaderData,
): SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetLoaderFolderStatistics> {
  const datas = loaders.filter((data) => {
    const { path } = data.resource;
    return path.startsWith(folder);
  });

  const filteredLoaders: Pick<
    SDK.LoaderTransformData,
    'loader' | 'startAt' | 'endAt' | 'pid'
  >[] = [];
  const uniqueLoaders: Map<string, { files: number; path: string }> = new Map();

  datas.forEach((data) => {
    data.loaders.forEach((fl) => {
      const uniqueLoader = uniqueLoaders.get(fl.loader);
      if (uniqueLoader) {
        uniqueLoaders.set(fl.loader, {
          files: uniqueLoader.files + 1,
          path: fl.path,
        });
      } else {
        uniqueLoaders.set(fl.loader, { files: 1, path: fl.path });
      }

      return filteredLoaders.push({
        loader: fl.loader,
        startAt: fl.startAt,
        endAt: fl.endAt,
        pid: fl.pid,
      });
    });
  });
  const loaderCosts: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetLoaderFolderStatistics> =
    Array.from(uniqueLoaders).map((uniqueLoader) => {
      const filter = (l: { loader: string }) => l.loader === uniqueLoader[0];
      const costs = getLoadersCosts(filter, filteredLoaders);
      return {
        loader: uniqueLoader[0] as string,
        files: uniqueLoader[1].files,
        path: uniqueLoader[1].path,
        costs,
      };
    });

  return loaderCosts;
}

function collectResourceDirectories(
  loaders: SDK.LoaderData,
  root: string,
): string[] {
  const directories = new Set<string>();

  loaders.forEach((item) => {
    if (item.resource.path.startsWith(root)) {
      const pathParts = item.resource.path
        .split(root)
        .slice(1)
        .join('/')
        .split('/');
      if (pathParts.length >= 2) {
        const twoLevelDir = pathParts.slice(0, 2).join('/');
        directories.add(`${root}/${twoLevelDir}`);
      }
    } else {
      const pathParts = item.resource.path.split('/');
      const twoLevelDir = pathParts.slice(0, pathParts.length - 1).join('/');
      directories.add(twoLevelDir);
    }
  });

  return Array.from(directories);
}

export function getDirectoriesLoaders(
  loaders: SDK.LoaderData,
  root?: string,
): {
  directory: string;
  stats: SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetLoaderFolderStatistics>;
}[] {
  const rootPath = root || process.cwd();
  const directories = collectResourceDirectories(loaders, rootPath);

  return directories.map((directory) => {
    const stats = getLoaderFolderStatistics(directory, loaders);
    return {
      directory,
      stats,
    };
  });
}

export function getLoaderFileFirstInput(
  file: string,
  loaders: SDK.LoaderData,
): SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetLoaderFileFirstInput> {
  for (let i = 0; i < loaders.length; i++) {
    const item = loaders[i];

    if (item.resource.path === file) {
      const nonPitchLoaders = item.loaders.filter((e) => !e.isPitch);
      if (!nonPitchLoaders.length) return '';
      return nonPitchLoaders[0].input || '';
    }
  }
  return '';
}

export function getLoaderFileInputAndOutput(
  file: string,
  loader: string,
  loaderIndex: number,
  loaders: SDK.LoaderData,
): SDK.ServerAPI.InferResponseType<SDK.ServerAPI.API.GetLoaderFileInputAndOutput> {
  for (let i = 0; i < loaders.length; i++) {
    const item = loaders[i];

    if (item.resource.path === file) {
      // biome-ignore lint/correctness/noUnreachable: may not need change
      for (let j = 0; j < item.loaders.length; j++) {
        const l = item.loaders[j];
        if (l.loader === loader && l.loaderIndex === loaderIndex) {
          return {
            input: l.input || '',
            output: l.result || '',
          };
        }

        return {
          input: '',
          output: '',
        };
      }
    }
  }

  return {
    input: '',
    output: '',
  };
}

export const LoaderInternalPropertyName = '__l__';

export const isVue = (compiler: Plugin.BaseCompiler) => {
  const rules =
    ('module' in compiler.options && compiler.options.module.rules) || [];
  const hasVueRule = rules.some((rule) => {
    if (
      rule &&
      typeof rule === 'object' &&
      rule.test instanceof RegExp &&
      rule.test?.test('.vue')
    ) {
      return true;
    }
    return false;
  });
  return hasVueRule;
};

const getLoadrName = (loader: string) => {
  const regResults = loader.includes('node_modules')
    ? loader.split('node_modules')
    : null;
  return regResults ? regResults[regResults.length - 1] : loader;
};
