const { parseQuery } = require('loader-utils');

/**
 * @type {import("@rspack/core").LoaderDefinitionFunction<{}, {}>}
 */
module.exports = function (input) {
  const res = [input, `// ${JSON.stringify(this.query)}`];

  // Based on Windi CSS template loader behavior.
  // test the loader query
  if (this.query !== '') {
    res.push(`// ${JSON.stringify(parseQuery(this.query))}`);
  }

  return res.join('\n');
};
