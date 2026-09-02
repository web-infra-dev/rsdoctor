import fs from 'node:fs';
import path from 'node:path';
import { define } from 'rstack';

const siteUrl = 'https://rsdoctor.rs';
const llmsFiles = [
  'llms.txt',
  'llms-full.txt',
  'zh/llms.txt',
  'zh/llms-full.txt',
];

const isV1ArchiveUrl = (url: string) => {
  try {
    return /^\/(?:zh\/)?guide\/v1(?:\/|$)/.test(new URL(url, siteUrl).pathname);
  } catch {
    return false;
  }
};

const isV1ArchiveSection = (section: string) => {
  const url = section.match(/^url:\s*(.+)$/m)?.[1].trim();
  return url ? isV1ArchiveUrl(url) : false;
};

const isV1ArchiveLink = (line: string) => {
  const url = line.match(/^\s*-\s*\[.+?\]\(([^)]+)\)/)?.[1];
  return url ? isV1ArchiveUrl(url) : false;
};

const excludeV1ArchiveFromLlms = () => ({
  name: 'exclude-v1-archive-from-llms',
  async afterBuild() {
    await Promise.all(
      llmsFiles.map(async (file) => {
        const filePath = path.join(import.meta.dirname, 'doc_build', file);
        const content = await fs.promises.readFile(filePath, 'utf8');
        const nextContent = file.endsWith('llms-full.txt')
          ? content
              .split(/(?=^---\r?\nurl: )/gm)
              .filter((section) => !isV1ArchiveSection(section))
              .join('')
          : content
              .split('\n')
              .filter((line) => !isV1ArchiveLink(line))
              .join('\n');

        await fs.promises.writeFile(filePath, nextContent);
      }),
    );
  },
});

define.doc(async () => {
  const { pluginSass } = await import('@rsbuild/plugin-sass');
  const { pluginAlgolia } = await import('@rspress/plugin-algolia');
  const { pluginClientRedirects } =
    await import('@rspress/plugin-client-redirects');
  const { pluginRss } = await import('@rspress/plugin-rss');
  const { pluginGoogleAnalytics } =
    await import('rsbuild-plugin-google-analytics');
  const { pluginOpenGraph } = await import('rsbuild-plugin-open-graph');
  const { pluginFontOpenSans } = await import('rspress-plugin-font-open-sans');
  const { default: pluginSitemap } = await import('rspress-plugin-sitemap');

  return {
    plugins: [
      pluginClientRedirects({
        redirects: [{ from: '/guide/start/mcp', to: '/guide/v1/mcp' }],
      }),
      pluginAlgolia(),
      pluginSitemap({
        domain: siteUrl,
      }),
      excludeV1ArchiveFromLlms(),
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
    root: path.join(import.meta.dirname, 'docs'),
    title: 'Rsdoctor',
    description: 'A one-stop build analyzer for Rspack projects.',
    icon: 'https://assets.rspack.rs/rsdoctor/rsdoctor-logo-960x960.png',
    lang: 'en',
    base: '/',
    logo: {
      light: 'https://assets.rspack.rs/rsdoctor/rsdoctor-logo-light.png',
      dark: 'https://assets.rspack.rs/rsdoctor/rsdoctor-logo-dark.png',
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
        return `<meta property="og:image" content="https://assets.rspack.rs/rsdoctor/${getOgImage()}">`;
      },
    ],
    markdown: {
      link: {
        checkAnchors: true,
      },
    },
    ssg: true,
    llms: true,
    route: {
      cleanUrls: true,
      // exclude document fragments from routes
      exclude: [
        '**/zh/shared/**',
        '**/en/shared/**',
        '**/quick-start-shared.mdx',
      ],
    },
    globalStyles: path.join(import.meta.dirname, 'theme', 'index.css'),
    themeConfig: {
      llmsUI: {
        placement: 'outline',
      },
      footer: {
        message: 'Copyright © ByteDance',
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
      editLink: {
        docRepoBaseUrl:
          'https://github.com/web-infra-dev/rsdoctor/tree/main/packages/document/docs',
      },
      locales: [
        {
          lang: 'en',
          label: 'English',
          title: 'Rsdoctor',
          description: 'Build analyzer for Rspack projects',
        },
        {
          lang: 'zh',
          label: '简体中文',
          title: 'Rsdoctor',
          description: 'Rspack 项目的构建分析工具',
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
          url: 'https://rsdoctor.rs/',
          description: 'Build analyzer for Rspack projects',
          twitter: {
            site: '@rspack_dev',
            card: 'summary_large_image',
          },
        }),
      ],
      resolve: {
        alias: {
          '@components': path.join(import.meta.dirname, 'src/components'),
          '@en': path.join(import.meta.dirname, 'docs/en'),
          '@zh': path.join(import.meta.dirname, 'docs/zh'),
        },
      },
    },
    mediumZoom: {
      // Select all images that are NOT descendants of an anchor
      selector: '.rspress-doc img:not(a img)',
    },
  };
});
