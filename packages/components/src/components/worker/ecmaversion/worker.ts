import { parser, ECMAVersion } from '@rsdoctor/utils/ruleUtils';
import { handleMessageInWorker } from 'src/utils/worker';

const cache = new Map<string, ECMAVersion>();

handleMessageInWorker<string, ECMAVersion>({
  workerName: 'ecmaversion',
  handler: (code) => {
    if (cache.has(code)) return cache.get(code)!;

    const version = parser.utils.detectECMAVersion(code);

    cache.set(code, version);

    return version;
  },
});
