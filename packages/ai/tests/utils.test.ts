import path from 'node:path';
import fs from 'node:fs';
import { expect, test } from 'vitest';
import { extractPackageName } from '@/utils/chunks';

test('extractPackageName', async () => {
  const m = require(
    path.resolve(__dirname, './fixtures/filtered_modules.json'),
  );
  const newModules = m.map((i: any) => ({
    ...i,
    packageName: extractPackageName(i.path),
  }));
  fs.writeFileSync(
    path.join(__dirname, './fixtures/filtered_modules_with_package_name.json'),
    JSON.stringify(newModules, null, 2),
  );
});
