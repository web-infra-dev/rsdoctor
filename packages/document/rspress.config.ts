import path from 'node:path';
import { defineConfig } from 'rspress/config';
import { pluginFontOpenSans } from 'rspress-plugin-font-open-sans';
import { pluginOpenGraph } from 'rsbuild-plugin-open-graph';
import { pluginGoogleAnalytics } from 'rsbuild-plugin-google-analytics';

export default defineConfig({
  plugins: [pluginFontOpenSans()],
  root: path.join(__dirname, 'docs'),
  title: 'Rsdoctor',
  description: 'A one-stop build analyzer for Rspack and Webpack.',
  icon: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/lognuvj/rsdoctor/logo/rsdoctor-large.png',
  lang: 'en',
  base: '/',
  logo: {
    light:
      'https://lf3-static.bytednsdoc.com/obj/eden-cn/lognuvj/rsdoctor/logo/rsdoctor-logo-light.png',
    dark: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/lognuvj/rsdoctor/logo/rsdoctor-logo-dark.png',
  },
  head: [
    '<meta name="apple-mobile-web-app-capable" content="yes" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />',
  ],
  markdown: {
    checkDeadLinks: true,
  },
  route: {
    cleanUrls: true,
    // exclude document fragments from routes
    exclude: ['**/zh/shared/**', '**/en/shared/**'],
  },
  globalStyles: path.join(__dirname, 'theme', 'index.css'),
  themeConfig: {
    footer: {
      message: 'Copyright © 2024 ByteDance',
    },
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/web-infra-dev/rsdoctor',
      },
      {
        icon: 'twitter',
        mode: 'link',
        content: 'https://twitter.com/rspack_dev',
      },
      {
        icon: 'discord',
        mode: 'link',
        content: 'https://discord.gg/wrBPBT6rkM',
      },
    ],
    locales: [
      {
        lang: 'en',
        label: 'English',
        title: 'Rsdoctor',
        description: 'Build analyzer for Rspack and Webpack',
      },
      {
        lang: 'zh',
        label: '简体中文',
        title: 'Rsdoctor',
        description: 'Rspack 和 Webpack 项目的构建分析工具',
      },
    ],
  },
  builderConfig: {
    plugins: [
      pluginGoogleAnalytics({ id: 'G-9DETE89N4Q' }),
      pluginOpenGraph({
        title: 'Rsdoctor',
        type: 'website',
        url: 'https://rsdoctor.dev/',
        image: 'https://rsdoctor.dev/og-image.png',
        description: 'Build analyzer for Rspack and Webpack',
        twitter: {
          site: '@rspack_dev',
          card: 'summary_large_image',
        },
      }),
    ],
    source: {
      alias: {
        '@components': path.join(__dirname, 'src/components'),
        '@en': path.join(__dirname, 'docs/en'),
        '@zh': path.join(__dirname, 'docs/zh'),
      },
    },
    tools: {
      postcss(config, { addPlugins }) {
        addPlugins([require('tailwindcss')]);
      },
    },
  },
});
