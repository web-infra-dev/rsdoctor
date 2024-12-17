import { moduleTools, defineConfig } from '@modern-js/module-tools';

export default defineConfig({
  plugins: [moduleTools()],
  buildConfig: {
    buildType: 'bundleless',
    format: 'esm',
    target: 'es2020',
    outDir: './dist',
    dts: {
      abortOnError: false,
    },
    asset: {
      svgr: {
        include: /\.svg$/,
      },
    },
  },
});
