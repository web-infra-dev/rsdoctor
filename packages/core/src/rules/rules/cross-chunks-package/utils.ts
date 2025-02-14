export function getErrorMsgForDupPckChunks(
  chunks: String[],
  pkgName: String,
): string {
  let message = `The same module of Package ${pkgName} was bundled into different chunks:\n`;

  for (const chunkName of chunks) {
    message += ` ${chunkName}\n`;
  }

  return message.slice(0, -1);
}
