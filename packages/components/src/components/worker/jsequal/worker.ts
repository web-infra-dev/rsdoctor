import { minify as terserMinify } from 'terser';
import { handleMessageInWorker } from '../../../utils/worker';

const cache = new Map<string, boolean>();

function minify(code: string) {
  return terserMinify(code, {
    module: true,
    compress: false,
    mangle: false,
    sourceMap: false,
  }).then((res) => res.code);
}

handleMessageInWorker<{ input: string; output: string }, boolean>({
  workerName: 'jsequal',
  handler: async ({ input = '', output = '' }) => {
    const key = input + output;
    if (cache.has(key)) return cache.get(key)!;

    const [inputMinified, outputMinified] = await Promise.all([minify(input), minify(output)]);

    const isEqual = inputMinified === outputMinified;

    cache.set(key, isEqual);

    return isEqual;
  },
});
