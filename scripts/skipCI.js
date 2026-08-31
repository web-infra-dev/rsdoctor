import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SKIP_PATHS = [
  'cspell.json',
  '.github',
  '.vscode',
  'packages/document',
  'scripts/skipCI.js',
];
const SKIP_EXTENSIONS = ['.md', '.mdx'];

export function shouldSkipFile(file) {
  return (
    SKIP_PATHS.some(
      (skipPath) => file.startsWith(`${skipPath}/`) || file === skipPath,
    ) || SKIP_EXTENSIONS.some((extension) => file.endsWith(extension))
  );
}

export function shouldSkipCI(changedFiles) {
  return (
    changedFiles.length > 0 &&
    changedFiles.every((file) => shouldSkipFile(file))
  );
}

async function main() {
  execSync('git fetch origin main');

  const changedFilesOutput = execSync('git diff origin/main... --name-only', {
    stdio: 'pipe',
  }).toString();
  const changedFiles = changedFilesOutput
    .split('\n')
    .map((file) => file?.trim())
    .filter(Boolean);

  console.log(shouldSkipCI(changedFiles) ? 'true' : 'false');
}

const entryPath = process.argv[1];

if (entryPath && import.meta.url === pathToFileURL(resolve(entryPath)).href) {
  main().catch((err) => {
    console.error('Failed to detect CI skip', err);
    process.exit(1);
  });
}
