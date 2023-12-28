const { parser, ECMAVersion } = require('@rsdoctor/utils/ruleUtils');
const { handleMessageInWorker } = require('src/utils/worker');

const cache = new Map();

handleMessageInWorker({
  workerName: 'ecmaversion',
  handler: (code) => {
    if (cache.has(code)) return (cache.get(code) || '');

    const version = parser.utils.detectECMAVersion(code);

    cache.set(code, version);

    return version;
  },
});