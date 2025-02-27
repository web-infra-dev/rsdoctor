import { appTools, defineConfig } from '@modern-js/app-tools';
import { RsdoctorWebpackPlugin } from '@rsdoctor/webpack-plugin';

const pluginName = 'Rsdoctor';

export default defineConfig({
  runtime: {
    router: true,
    state: true,
    intl: {
      clientOptions: {
        apiKey: 'foo',
        namespace: 'ns-a',
      },
      intlOptions: {
        fallbackLng: 'zh',
        ns: ['ns-a'],
        defaultNS: 'ns-a',
      },
    },
  },
  plugins: [appTools()],

  tools: {
    bundlerChain: (chain) => {
      chain.plugin(pluginName).use(RsdoctorWebpackPlugin, [
        {
          linter: {
            rules: {
              'loader-performance-optimization': [
                'Error',
                {
                  threshold: 100,
                },
              ],
            },
          },
          disableClientServer: !process.env.ENABLE_CLIENT_SERVER,
          features: ['bundle', 'plugins', 'loader'],
        },
      ]);
    },
  },
  performance: {
    chunkSplit: {
      strategy: 'split-by-size',
      override: {
        chunks: 'initial',
        cacheGroups: {
          myapp: {
            test: /[\\/]node_modules[\\/]/,
            name: 'myapp-async',
            reuseExistingChunk: false,
            filename: 'static/js/myapp/[name].js',
            minChunks: 1,
            priority: 10,
          },
          myapp2: {
            test: /[\\/]node_modules[\\/]/,
            name: 'myapp2-async',
            reuseExistingChunk: false,
            filename: 'static/js/myapp2/[name].js',
            minChunks: 1,
            priority: 10,
          },
          default: {
            minChunks: 5,
            reuseExistingChunk: true,
            name: 'common',
          },
        },
      },
    },
    bundleAnalyze: {
      generateStatsFile: true,
      statsOptions: 'verbose',
    },
  },
});
