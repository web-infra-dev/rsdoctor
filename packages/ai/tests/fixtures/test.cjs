const chunks = require('./chunks.cjs');
const modules = require('./filtered_modules_2.json');

function fun(chunks, modules) {
  // Helper function to calculate median
  function calculateMedian(values) {
    if (values.length === 0) return 0;
    values.sort((a, b) => a - b);
    const half = Math.floor(values.length / 2);
    if (values.length % 2) return values[half];
    return (values[half - 1] + values[half]) / 2.0;
  }

  // Create a map for quick module lookup by id
  const moduleMap = new Map();
  modules.forEach((module) => {
    moduleMap.set(module.id, module);
  });

  // Filter initial chunks and calculate their sizes
  const initialChunks = chunks.filter((chunk) => chunk.initial);
  const initialChunkSizes = initialChunks.map((chunk) => chunk.size);
  const median = calculateMedian(initialChunkSizes);
  const oversizedThreshold = median * 1.3;

  // Analyze oversized initial chunks
  const oversizedChunks = initialChunks.filter(
    (chunk) => chunk.size > oversizedThreshold,
  );
  const results = oversizedChunks.map((chunk) => {
    const packageSizeMap = new Map();

    // Calculate package sizes within the chunk
    chunk.modules.forEach((moduleId) => {
      const module = moduleMap.get(moduleId);
      if (module && module.packageName) {
        const currentSize = packageSizeMap.get(module.packageName) || 0;
        packageSizeMap.set(
          module.packageName,
          currentSize + module.size.sourceSize,
        );
      }
    });

    // Determine which packages to split
    let reducedSize = 0;
    const splitPackages = [];
    const sortedPackages = Array.from(packageSizeMap.entries()).sort(
      (a, b) => b[1] - a[1],
    );

    for (const [packageName, packageSize] of sortedPackages) {
      if (chunk.size - reducedSize <= oversizedThreshold) break;
      splitPackages.push(packageName);
      reducedSize += packageSize;
    }

    return {
      id: chunk.id,
      name: chunk.name,
      size: chunk.size,
      split: splitPackages,
      reducedSize: reducedSize,
      splitedSize: chunk.size - reducedSize,
      median: median,
    };
  });

  return results;
}

const res = fun(chunks, modules);
console.log(res);
