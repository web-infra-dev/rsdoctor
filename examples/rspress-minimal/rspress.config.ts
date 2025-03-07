import * as path from 'node:path';
import { defineConfig } from 'rspress/config';
import { RsdoctorRspackPlugin } from '@rsdoctor/rspack-plugin';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  title: 'My Site',
  icon: '/rspress-icon.png',
  logo: {
    light: '/rspress-light-logo.png',
    dark: '/rspress-dark-logo.png',
  },
  themeConfig: {
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/web-infra-dev/rspress',
      },
    ],
  },
  builderConfig: {
    tools: {
      rspack(config, { appendPlugins, environment }) {
        if (environment.name === 'node' && process.env.RSDOCTOR) {
          appendPlugins(
            new RsdoctorRspackPlugin({
              output: {
                reportDir: path.join(__dirname, './doc_build/node/'),
              },
            }),
          );
        } else if (process.env.RSDOCTOR) {
          appendPlugins(new RsdoctorRspackPlugin({}));
        }
      },
    },
  },
});
