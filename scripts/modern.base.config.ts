import {
  defineConfig,
  moduleTools,
  type PartialBaseBuildConfig,
} from '@modern-js/module-tools';
import fs from 'node:fs';
import path from 'path';

const define = {
  RSDOCTOR_VERSION: require('../packages/core/package.json').version,
};

const BUILD_TARGET = 'es2020' as const;
// Clean tsc cache to ensure the dts files can be generated correctly
export const pluginCleanTscCache = {
  name: 'plugin-clean-tsc-cache',
  setup(api) {
    api.onBeforeBuild(() => {
      const tsbuildinfo = path.join(
        api.context.rootPath,
        'tsconfig.tsbuildinfo',
      );
      if (fs.existsSync(tsbuildinfo)) {
        fs.rmSync(tsbuildinfo);
      }
    });
  },
};

export const baseBuildConfig = {
  plugins: [moduleTools(), pluginCleanTscCache],
  buildConfig: {
    buildType: 'bundleless' as const,
    format: 'cjs' as const,
    target: BUILD_TARGET,
    define,
  },
};

export default defineConfig(baseBuildConfig);

export const buildConfigWithMjs: PartialBaseBuildConfig[] = [
  {
    format: 'cjs',
    target: BUILD_TARGET,
    define,
    autoExtension: true,
    dts: {
      respectExternal: false,
    },
  },
  {
    format: 'esm',
    target: BUILD_TARGET,
    dts: false,
    define,
    autoExtension: true,
    shims: true,
    esbuildOptions: (option) => {
      let { inject } = option;
      const filepath = path.join(__dirname, 'requireShims.js');
      if (inject) {
        inject.push(filepath);
      } else {
        inject = [filepath];
      }
      return {
        ...option,
        inject,
      };
    },
  },
];

export const configWithMjs = defineConfig({
  plugins: [moduleTools(), pluginCleanTscCache],
  buildConfig: buildConfigWithMjs,
});

export const configWithEsm = defineConfig({
  plugins: [moduleTools(), pluginCleanTscCache],
  buildConfig: [
    {
      buildType: 'bundleless',
      format: 'cjs',
      target: BUILD_TARGET,
      outDir: './dist/cjs',
      dts: {
        distPath: '../type',
      },
    },
    {
      buildType: 'bundleless',
      format: 'esm',
      target: BUILD_TARGET,
      outDir: './dist/esm',
      dts: false,
    },
  ],
});
