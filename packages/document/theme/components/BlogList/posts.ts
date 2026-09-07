import { yifancong } from '../blogAuthors';

export const posts = [
  {
    path: "release/release-note-2_0",
    authors: [yifancong],
    date: "2026-09",
    en: {
      title: "Announcing Rsdoctor 2.0",
      description:
        "Deeper Rspack analysis, Agent CLI workflows, multi-compiler reports, a smaller installation, and faster rebuild analysis.",
    },
    zh: {
      title: "Rsdoctor 2.0 发布公告",
      description:
        "更深入的 Rspack 分析、Agent CLI 工作流、多编译器报告、更小的安装体积与更快的重构建分析。",
    },
  },
  {
    path: "release/release-note-1_2",
    authors: [yifancong],
    date: "2025-08",
    en: {
      title: "Announcing Rsdoctor 1.2",
      description:
        "Explore concatenated modules, gzip sizes, an improved treemap, and the Rsdoctor MCP integration introduced in 1.2.",
    },
    zh: {
      title: "Rsdoctor 1.2 发布公告",
      description:
        "深入分析串联模块，查看 Gzip 体积，体验增强的 Treemap，以及 1.2 引入的 Rsdoctor MCP 集成。",
    },
  },
  {
    path: "release/release-note-1_0",
    authors: [yifancong],
    date: "2025-03-19",
    en: {
      title: "Announcing Rsdoctor 1.0",
      description:
        "A redesigned interface, faster analysis, module search, and new rules for identifying build issues.",
    },
    zh: {
      title: "Rsdoctor 1.0 发布公告",
      description:
        "全新界面、更高的分析效率、模块搜索与新增扫描规则，帮助定位构建问题。",
    },
  },
  {
    path: "release/release-note-0_4",
    authors: [yifancong],
    date: "2024-10-09",
    en: {
      title: "Announcing Rsdoctor 0.4",
      description:
        "Share reports as a single HTML file, compare bundles, and analyze Vue loaders.",
    },
    zh: {
      title: "Rsdoctor 0.4 发布公告",
      description:
        "通过单个 HTML 文件分享报告，对比构建产物，并分析 Vue Loader。",
    },
  },
  {
    path: "release/release-note-0_3",
    authors: [yifancong],
    date: "2024-06-02",
    en: {
      title: "Announcing Rsdoctor 0.3",
      description:
        "Add custom scan rules and inspect builds with BannerPlugin and ESM loaders.",
    },
    zh: {
      title: "Rsdoctor 0.3 发布公告",
      description:
        "自定义扫描规则，支持 BannerPlugin 和 ESM Loader 的构建分析。",
    },
  },
  {
    path: "release/release-note-0_1",
    authors: [yifancong],
    date: "2024-01-24",
    en: {
      title: "Announcing Rsdoctor 0.1",
      description:
        "Introducing Rsdoctor: visualize compilation, inspect bundles, and find build bottlenecks.",
    },
    zh: {
      title: "Rsdoctor 0.1 发布公告",
      description:
        "认识 Rsdoctor：让编译过程可视化，分析构建产物，定位构建瓶颈。",
    },
  },
  {
    path: "topic/loader-optimization",
    authors: [yifancong],
    en: {
      title: "Loader analysis and optimization",
      description:
        "Use file trees, execution times, and transformation details to find and reduce unnecessary loader work.",
    },
    zh: {
      title: "Loader 分析与优化",
      description:
        "结合文件树、执行耗时和转换详情，定位并减少不必要的 Loader 处理。",
    },
  },
  {
    path: "topic/duplicate-pkg-problem",
    authors: [yifancong],
    en: {
      title: "Duplicate dependency problem",
      description:
        "Understand the impact of duplicate packages and resolve them through dependency and bundler configuration.",
    },
    zh: {
      title: "重复依赖问题",
      description:
        "了解重复依赖的影响，从依赖管理和构建配置两方面解决重复打包问题。",
    },
  },
];
