const { parseQuery } = require('loader-utils');

/**
 * @type {import("@rspack/core").LoaderDefinitionFunction<{}, {}>}
 */
module.exports = function (input) {
  const res = [input, `// ${JSON.stringify(this.resourceQuery)}`];

  // Based on Windi CSS template loader behavior.
  // test the loader query
  if (this.resourceQuery !== '') {
    res.push(`// ${JSON.stringify(parseQuery(this.resourceQuery))}`);
  }

  return res.join('\n');
};
