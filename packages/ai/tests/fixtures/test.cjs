const chunks = require('./chunks_client.json');
const modules = require('./modules_client.json');

function fun(chunks, modules) {
  // Helper function to calculate the median
  function calculateMedian(values) {
    if (values.length === 0) return 0;
    values.sort((a, b) => a - b);
    const half = Math.floor(values.length / 2);
    if (values.length % 2) return values[half];
    return (values[half - 1] + values[half]) / 2.0;
  }

  // Helper function to group modules by packageName
  function groupModulesByPackageName(modules) {
    const groups = {};
    modules.forEach((module) => {
      if (module.packageName) {
        if (!groups[module.packageName]) {
          groups[module.packageName] = [];
        }
        groups[module.packageName].push(module);
      }
    });
    return groups;
  }

  // Helper function to calculate the size of a group of modules
  function calculateGroupSize(group) {
    return group.reduce((sum, module) => sum + module.size.parsedSize, 0);
  }

  // Get all initial chunks
  const initialChunks = chunks.filter((chunk) => chunk.initial);

  // Calculate the median size of all initial chunks
  const initialChunkSizes = initialChunks.map((chunk) => chunk.size);
  const medianSize = calculateMedian(initialChunkSizes);

  // Determine oversized chunks
  const oversizedChunks = initialChunks.filter(
    (chunk) => chunk.size > 1.3 * medianSize,
  );

  // Process each oversized chunk
  const results = oversizedChunks.map((chunk) => {
    // Get modules in the chunk
    const chunkModules = chunk.modules
      .map((moduleId) => modules.find((module) => module.id === moduleId))
      .filter(Boolean);

    // Group modules by packageName
    const groupedModules = groupModulesByPackageName(chunkModules);

    // Calculate the size of each group
    const groupSizes = Object.entries(groupedModules).map(
      ([packageName, group]) => ({
        packageName,
        size: calculateGroupSize(group),
      }),
    );

    // Calculate reducedSize and splitedSize
    const reducedSize = groupSizes.reduce((sum, group) => sum + group.size, 0);
    const splitedSize = chunk.size - reducedSize;

    return {
      ...chunk,
      groups: groupSizes,
      reducedSize,
      splitedSize,
      median: medianSize,
    };
  });

  return results;
}

const res = fun(chunks, modules);
console.log(res);
