import { parseQuery } from 'loader-utils';

/**
 * @type {import("webpack").LoaderDefinitionFunction<{}, {}>}
 */
const loader = (input) => {
  const res = [input, `// ${JSON.stringify(this?.query || '')}`];

  // Based on https://github.com/windicss/windicss-webpack-plugin/blob/main/src/loaders/windicss-template.ts#L42
  // test the loader query
  if (this?.query && this?.query !== '') {
    res.push(`// ${JSON.stringify(parseQuery(this?.query))}`);
  }

  return res.join('\n');
};

export default loader;
