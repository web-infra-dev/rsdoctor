import path from 'node:path';
import { defineConfig } from 'rspress/config';
import { pluginSass } from '@rsbuild/plugin-sass';
import { pluginFontOpenSans } from 'rspress-plugin-font-open-sans';
import { pluginOpenGraph } from 'rsbuild-plugin-open-graph';
import { pluginGoogleAnalytics } from 'rsbuild-plugin-google-analytics';
import { pluginRss } from '@rspress/plugin-rss';
import pluginSitemap from 'rspress-plugin-sitemap';

const siteUrl = 'https://rsdoctor.dev';

export default defineConfig({
  plugins: [
    pluginSitemap({
      domain: siteUrl,
    }),
    pluginFontOpenSans(),
    pluginRss({
      siteUrl,
      feed: [
        {
          id: 'releases-rss',
          test: '/blog/release/release-note-',
          title: 'Rsdoctor Releases',
          language: 'en',
          output: {
            type: 'rss',
            filename: 'releases-rss.xml',
          },
        },
        {
          id: 'releases-rss-zh',
          test: '/zh/blog/release/release-note-',
          title: 'Rsdoctor 发布',
          language: 'zh-CN',
          output: {
            type: 'rss',
            filename: 'releases-rss-zh.xml',
          },
        },
        {
          id: 'blog-rss',
          test: '/blog/topic',
          title: 'Rsdoctor Blog',
          language: 'en',
          output: {
            type: 'rss',
            filename: 'blog-rss.xml',
          },
        },
        {
          id: 'blog-rss-zh',
          test: '/zh/blog/topic',
          title: 'Rsdoctor 博客',
          language: 'zh-CN',
          output: {
            type: 'rss',
            filename: 'blog-rss-zh.xml',
          },
        },
      ],
    }),
  ],
  root: path.join(__dirname, 'docs'),
  title: 'Rsdoctor',
  description: 'A one-stop build analyzer for Rspack and webpack.',
  icon: 'https://assets.rspack.dev/rsdoctor/rsdoctor-logo-960x960.png',
  lang: 'en',
  base: '/',
  logo: {
    light: 'https://assets.rspack.dev/rsdoctor/rsdoctor-logo-light.png',
    dark: 'https://assets.rspack.dev/rsdoctor/rsdoctor-logo-dark.png',
  },
  head: [
    '<meta name="apple-mobile-web-app-capable" content="yes" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />',
    ({ routePath }) => {
      const getOgImage = () => {
        if (routePath.endsWith('release-note-1_0')) {
          return 'assets/rsdoctor-og-image-v1-0.png';
        }
        return 'rsdoctor-og-image.png';
      };
      return `<meta property="og:image" content="https://assets.rspack.dev/rsdoctor/${getOgImage()}">`;
    },
  ],
  markdown: {
    checkDeadLinks: true,
  },
  ssg: {
    strict: true,
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
        icon: 'X',
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
        description: 'Build analyzer for Rspack and webpack',
        editLink: {
          docRepoBaseUrl:
            'https://github.com/web-infra-dev/rsdoctor/tree/main/packages/document/docs',
          text: '📝 Edit this page on GitHub',
        },
      },
      {
        lang: 'zh',
        label: '简体中文',
        title: 'Rsdoctor',
        description: 'Rspack 和 webpack 项目的构建分析工具',
        editLink: {
          docRepoBaseUrl:
            'https://github.com/web-infra-dev/rsdoctor/tree/main/packages/document/docs',
          text: '📝 在 GitHub 上编辑此页',
        },
      },
    ],
  },
  builderConfig: {
    plugins: [
      pluginSass(),
      pluginGoogleAnalytics({ id: 'G-9DETE89N4Q' }),
      pluginOpenGraph({
        title: 'Rsdoctor',
        type: 'website',
        url: 'https://rsdoctor.dev/',
        description: 'Build analyzer for Rspack and webpack',
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
  },
});
