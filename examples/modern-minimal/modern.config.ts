import appTools, { defineConfig } from '@modern-js/app-tools';
import { RsdoctorWebpackPlugin } from '@rsdoctor/webpack-plugin';

const pluginName = 'Web Doctor';

export default defineConfig({
  source: {
    entries: {
      main: './src/index.ts',
    },
  },
  plugins: [appTools()],
  builderPlugins: [
    {
      name: pluginName,
      setup(builder) {
        builder.modifyWebpackChain((chain) => {
          chain.plugin(pluginName).use(RsdoctorWebpackPlugin, [
            {
              disableClientServer: !process.env.ENABLE_CLIENT_SERVER,
            },
          ]);
        });
      },
    },
  ],
});
