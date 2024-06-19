import { filesize } from 'filesize';
import { memoryUsage, pid } from 'process';

export function getMemoryUsage() {
  return memoryUsage();
}

export function getMemoryUsageMessage() {
  const usage = getMemoryUsage();

  // https://nodejs.org/api/process#processmemoryusage
  const msgs = [
    `RSS: ${filesize(usage.rss)}`,
    `Heap Total: ${filesize(usage.heapTotal)}`,
    `Heap Used: ${filesize(usage.heapUsed)}`,
  ];

  if (usage.arrayBuffers) {
    msgs.push(`ArrayBuffers: ${filesize(usage.arrayBuffers)}`);
  }

  if (usage.external) {
    msgs.push(`External: ${filesize(usage.external)}`);
  }

  return `["${pid}" Memory Usage] ${msgs.join(', ')}`;
}
