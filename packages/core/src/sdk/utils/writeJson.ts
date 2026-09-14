import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export function writeJsonAtomic(filePath: string, data: unknown): void {
  const content = JSON.stringify(data);
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  try {
    fs.writeFileSync(temporaryPath, content);
    fs.renameSync(temporaryPath, filePath);
  } finally {
    fs.rmSync(temporaryPath, { force: true });
  }
}
