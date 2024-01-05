import * as path from 'path';
import { defineConfig }from 'rspress/config';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  title: 'Rsdoctor',
  description: 'A one-stop build analyzer for Rspack and Webpack.',
  icon: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/lognuvj/rsdoctor/logo/rsdoctor-large.png',
  lang: 'en',
  base: '/',
  logo: {
    light: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/lognuvj/rsdoctor/logo/rsdoctor-logo-light.png',
    dark: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/lognuvj/rsdoctor/logo/rsdoctor-logo-dark.png',
  },
  head: [
    '<meta name="apple-mobile-web-app-capable" content="yes" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />',
  ],
  markdown: {
    checkDeadLinks: true,
    experimentalMdxRs: true,
  },
  route: {
    cleanUrls: true,
    // exclude document fragments from routes
    exclude: ['**/zh/shared/**', '**/en/shared/**'],
  },
  globalStyles: path.join(__dirname, 'theme', 'index.css'),
  themeConfig: {
    footer: {
      message: "Copyright © 2023 Bytedance",
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
        description: 'TAnalyzer for Rspack and Webpack',
      },
      {
        lang: 'zh',
        label: '简体中文',
        title: 'Rsdoctor',
        description: 'Rspack 和 Webpack 项目的构建分析器',
      },
    ],
  },
  builderConfig: {
    source: {
      alias: {
        '@components': path.join(__dirname, 'src/components'),
        '@en': path.join(__dirname, 'docs/en'),
        '@zh': path.join(__dirname, 'docs/zh'),
      },
    },
    tools: {
      postcss(config, { addPlugins }) {
        addPlugins([require("tailwindcss")]);
      },
    },
    html: {
      tags: [
        // Configure Google Analytics
        {
          tag: 'script',
          attrs: {
            async: true,
            src: 'https://www.googletagmanager.com/gtag/js?id=G-L6BZ6TKW4R',
          },
        },
        {
          tag: 'script',
          children: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-L6BZ6TKW4R');`,
        },
      ],
    },
  },
});
