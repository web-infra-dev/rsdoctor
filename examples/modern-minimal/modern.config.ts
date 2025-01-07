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
        chunks: 'initial', // 处理所有类型的 chunk
        cacheGroups: {
          myapp: {
            test: /[\\/]node_modules[\\/]/,
            name: 'myapp-async',
            reuseExistingChunk: false,
            filename: 'static/js/myapp/[name].js', // 指定 myapp 的 async chunk 输出路径
            minChunks: 1,
            priority: 10,
          },
          myapp2: {
            test: /[\\/]node_modules[\\/]/,
            name: 'myapp2-async',
            reuseExistingChunk: false,
            filename: 'static/js/myapp2/[name].js', // 指定 myapp2 的 async chunk 输出路径
            minChunks: 1,
            priority: 10,
          },
          default: {
            minChunks: 5, // 至少被引入两次的模块
            reuseExistingChunk: true, // 复用已存在的 chunk
            name: 'common', // 输出的文件名
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
