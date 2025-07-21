import path from 'path';
import fs from 'fs';

export function findRoot(startDir = process.cwd()) {
  let dir = startDir;
  let firstPkgDir: string | null = null;
  while (dir !== path.parse(dir).root) {
    // 1. pnpm
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    // 2. yarn
    if (fs.existsSync(path.join(dir, 'yarn.lock'))) return dir;
    // 3. lerna
    if (fs.existsSync(path.join(dir, 'lerna.json'))) return dir;
    // 4. package.json with workspaces
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      if (!firstPkgDir) firstPkgDir = dir;
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.workspaces) return dir;
    }
    dir = path.dirname(dir);
  }
  // If no monorepo marker found, but a package.json exists, treat it as root
  if (firstPkgDir) return firstPkgDir;
  return null;
}
