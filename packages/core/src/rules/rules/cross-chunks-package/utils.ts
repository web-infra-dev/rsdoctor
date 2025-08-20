export function getErrorMsgForDupPckChunks(
  chunks: string[],
  pkgName: string,
): string {
  let message = `The same package ${pkgName} was bundled into different chunks:\n`;

  for (const chunkName of chunks) {
    message += ` ${chunkName}\n`;
  }

  return message.slice(0, -1);
}
