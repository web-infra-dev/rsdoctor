import { execFileSync } from 'node:child_process';
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const target = path.resolve(process.argv[2]);
const tarballs = path.join(target, 'tarballs');
await mkdir(tarballs, { recursive: true });
const dependencies = {};
for (const directory of ['shared', 'client', 'core', 'cli', 'agent-cli']) {
  const cwd = path.join(repo, 'packages', directory);
  const pkg = JSON.parse(
    await readFile(path.join(cwd, 'package.json'), 'utf8'),
  );
  execFileSync('pnpm', ['pack', '--pack-destination', tarballs], {
    cwd,
    stdio: 'inherit',
  });
  dependencies[pkg.name] =
    `file:./tarballs/${pkg.name.replace('@', '').replace('/', '-')}-${pkg.version}.tgz`;
}
// Match the bundler used to build this checkout, rather than testing a floating latest release.
const require = createRequire(path.join(repo, 'packages/core/package.json'));
dependencies['@rspack/core'] = require('@rspack/core/package.json').version;
await writeFile(
  path.join(target, 'package.json'),
  JSON.stringify(
    {
      private: true,
      type: 'module',
      dependencies,
    },
    null,
    2,
  ) + '\n',
);
await copyFile(
  new URL('./smoke.test.mjs', import.meta.url),
  path.join(target, 'smoke.test.mjs'),
);
console.log(
  `Prepared ${(await readdir(tarballs)).length} tarballs in ${target}`,
);
