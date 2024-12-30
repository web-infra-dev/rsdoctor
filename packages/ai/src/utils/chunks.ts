import type {
  Chunk,
  FilteredModule,
  SimpleChunk,
  SimpleModule,
} from '@/types/index';

export const getMedianChunkSize = (list: Chunk[]): number => {
  const sortedList = list.sort((a, b) => a.size - b.size);
  const middle = Math.floor(sortedList.length / 2);

  if (sortedList.length % 2 === 0) {
    return (sortedList[middle - 1].size + sortedList[middle].size) / 2;
  }
  return sortedList[middle].size;
};

// caclulate the oversized chunks, which are larger than the median chunk size by a factor of 1.3
export const getOversizedChunks = (
  list: Chunk[],
  operator = 1.3,
): [Chunk[], number] => {
  const medianChunkSize = getMedianChunkSize(list);
  return [
    list.filter((chunk) => chunk.size > medianChunkSize * operator),
    medianChunkSize,
  ];
};

const PACKAGE_PATH_NAME =
  /(?:(?:node_modules|~)(?:\/\.pnpm)?\/)(?:((?:@[a-zA-Z0-9]+(?:[-|_|.]+[a-zA-Z0-9]+)*[/|+])?(?:(?:[a-zA-Z0-9]+(?:[-|_|.]+[a-zA-Z0-9]+)*\+)*)(?:[a-zA-Z0-9]+(?:[-|_|.]+[a-zA-Z0-9]+)*))(?:@[\w|\-|_|.]+)?)(?:_((?:@[a-zA-Z0-9]+(?:[-|_|.]+[a-zA-Z0-9]+)*[/|+])?(?:[a-zA-Z0-9]+(?:[-|_|.]+[a-zA-Z0-9]+)*))(?:@[a-zA-Z0-9]+(?:[-|_|.]+[a-zA-Z0-9]+)*))*\//gm;

// trans module info to package
export const formatModulesToPackages = (
  modules: SimpleModule[],
): { name: string; size: number }[] => {
  const packages: Record<string, { size: number }> = {};
  modules.forEach((m) => {
    if (!m.path) {
      return;
    }
    // package name
    const packageMatch = m.path.match(PACKAGE_PATH_NAME);
    const packageName = (
      packageMatch
        ? packageMatch[2] || packageMatch[1] || packageMatch[0]
        : 'unknown'
    ).replace('node_modules/', '');

    if (!packages[packageName]) {
      packages[packageName] = { size: m.sourceSize };
    } else {
      packages[packageName].size += m.sourceSize;
    }
  });

  return Object.entries(packages).map(([name, { size }]) => ({
    name,
    size,
  }));
};

export const getSimpleChunk = (
  chunk: Chunk,
  modules: FilteredModule[],
): SimpleChunk => {
  return {
    id: chunk.id,
    name: chunk.name,
    size: chunk.size,
    modules: chunk.modules
      .map((mId) => {
        const m = modules.find((m) => m.id === mId);
        if (!m) {
          return null;
        }
        if (!m.webpackId.includes('node_modules')) {
          return null;
        }
        return {
          id: mId,
          sourceSize: m.size.sourceSize,
          path: m.path,
        };
      })
      .filter(Boolean) as SimpleModule[],
  };
};

export const extractPackageName = (path: string) => {
  const nodeModulesCount = (path.match(/node_modules/g) || []).length;
  if (nodeModulesCount >= 2) {
    const secondNodeModulesIndex = path.indexOf(
      '/node_modules/',
      path.indexOf('/node_modules/') + 1,
    );
    const partAfterSecondNodeModules = path.slice(
      secondNodeModulesIndex + '/node_modules/'.length,
    );
    const firstSlashIndex = partAfterSecondNodeModules.indexOf('/');
    if (partAfterSecondNodeModules.startsWith('@')) {
      if (firstSlashIndex !== -1) {
        const secondSlashIndex = partAfterSecondNodeModules.indexOf(
          '/',
          firstSlashIndex + 1,
        );
        if (secondSlashIndex !== -1) {
          return partAfterSecondNodeModules.slice(0, secondSlashIndex);
        }
      }
      return partAfterSecondNodeModules;
    }
    if (firstSlashIndex !== -1) {
      return partAfterSecondNodeModules.slice(0, firstSlashIndex);
    }
    return partAfterSecondNodeModules;
  }
  return null;
};
