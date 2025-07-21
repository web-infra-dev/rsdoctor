import {
  defineConfig,
  moduleTools,
  type PartialBaseBuildConfig,
} from '@modern-js/module-tools';

const define = {
  RSDOCTOR_VERSION: require('../packages/core/package.json').version,
};

const BUILD_TARGET = 'es2020' as const;

export const baseBuildConfig = {
  plugins: [moduleTools()],
  buildConfig: {
    buildType: 'bundleless' as const,
    format: 'cjs' as const,
    target: BUILD_TARGET,
    define,
  },
};

export default defineConfig(baseBuildConfig);

export const configWithEsm = defineConfig({
  plugins: [moduleTools()],
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
