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
});
