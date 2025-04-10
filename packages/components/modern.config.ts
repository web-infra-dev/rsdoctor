import { defineConfig, moduleTools } from '@modern-js/module-tools';

export default defineConfig({
  plugins: [moduleTools()],
  buildConfig: {
    buildType: 'bundleless',
    format: 'esm',
    target: 'es2020',
    outDir: './dist',
    sourceMap: true,
    minify: false,
    asset: {
      svgr: {
        include: /\.svg$/,
      },
    },
  },
});
