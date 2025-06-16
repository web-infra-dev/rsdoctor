import type { Configuration } from '@rspack/core';

const {
  createRspeedy,
} = require('node_modules/@lynx-js/rspeedy/dist/index.js');
import type { Config, RspeedyInstance } from '@lynx-js/rspeedy';

interface RsbuildHelper {
  unwrapConfig(): Promise<Configuration>;
  usingDevServer(): Promise<{
    port: number;
    urls: string[];
    waitDevCompileDone(timeout?: number): Promise<void>;
    [Symbol.asyncDispose](): Promise<void>;
  }>;
}

// Custom wait function to replace vi.waitUntil
async function waitUntil(
  condition: () => boolean,
  options: { timeout?: number } = {},
) {
  const startTime = Date.now();
  const timeout = options.timeout ?? 5000;

  while (Date.now() - startTime < timeout) {
    if (condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timeout after ${timeout}ms`);
}

export async function createStubRspeedy(
  config: Config,
  cwd?: string,
): Promise<RspeedyInstance & RsbuildHelper> {
  const rsbuild = await createRspeedy({
    rspeedyConfig: config,
    cwd: cwd ?? process.cwd(),
  });

  const helper: RsbuildHelper = {
    // @ts-ignore
    async unwrapConfig() {
      const [config] = await rsbuild.initConfigs();
      return config!;
    },

    async usingDevServer() {
      let done = false;
      rsbuild.onDevCompileDone({
        handler: () => {
          done = true;
        },
        // We make sure this is run at the last
        // Otherwise, we would call `compiler.close()` before getting stats.
        order: 'post',
      });

      const devServer = await rsbuild.createDevServer();

      const { server, port, urls } = await devServer.listen();

      return {
        port,
        urls,
        async waitDevCompileDone(timeout?: number) {
          await waitUntil(() => done, { timeout });
        },
        async [Symbol.asyncDispose]() {
          return await server.close();
        },
      };
    },
  };

  return Object.assign(rsbuild, helper);
}
