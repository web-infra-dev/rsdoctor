import { parseQuery } from 'loader-utils';

/**
 * @type {import("@rspack/core").LoaderDefinitionFunction<{}, {}>}
 */
const loader = (input) => {
  const res = [input, `// ${JSON.stringify(this?.query || '')}`];

  // Based on Windi CSS template loader behavior.
  // test the loader query
  if (this?.query && this?.query !== '') {
    res.push(`// ${JSON.stringify(parseQuery(this?.query))}`);
  }

  return res.join('\n');
};

export default loader;
