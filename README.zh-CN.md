<picture>
  <img alt="Rsdoctor Banner" width="100%" src="https://github.com/web-infra-dev/rsdoctor/assets/7237365/0f9d2e86-d919-451a-befa-fa84603a87cf" />
</picture>

# Rsdoctor

<p>
  <a href="https://discord.gg/wrBPBT6rkM"><img src="https://img.shields.io/badge/chat-discord-blue?style=flat-square&logo=discord&colorA=564341&colorB=EDED91" alt="discord channel" /></a>
  <a href="https://npmjs.com/package/@rsdoctor/core?activeTab=readme"><img src="https://img.shields.io/npm/v/@rsdoctor/core?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" /></a>
  <a href="https://npmcharts.com/compare/@rsdoctor/core?minimal=true"><img src="https://img.shields.io/npm/dm/@rsdoctor/core.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="downloads" /></a>
  <a href="https://github.com/web-infra-dev/rsbuild/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@rsdoctor/core?style=flat-square&colorA=564341&colorB=EDED91" alt="license" /></a>
</p>

[English](./README.md) | 简体中文

## 💡 什么是 Rsdoctor？

- Rsdoctor 是一个面向构建过程与构建产物提供诊断和分析的一站式工具。
- Rsdoctor 是一个支持 **Webpack** 及 **Rspack** 构建分析工具。
- Rsdoctor 是一个可以展示编译耗时及编译行为细节的分析工具。
- Rsdoctor 是一个可以支持 **Rspack builtin:swc-loader** 构建耗时及构建行为分析的工具

## 📌 定位

**Rsdoctor** 是一个构建分析工具，用于分析基于 [Rspack](https://www.rspack.dev/) 和 [Webpack](https://webpack.js.org/) 构建的项目。它支持分析的项目包括：[Rsbuild](https://rsbuild.dev/)、[Create-react-app](https://create-react-app.dev/)、[Modern.js](https://modernjs.dev/) 等。

<div align=center>
 <img src="https://github.com/web-infra-dev/rsdoctor/assets/18437716/4f28312a-68bf-4f9c-91cb-6fd603a37f53" alt="duplicate packages" />
</div>

## 📚 快速上手

你可以参考 [快速上手](https://rsdoctor.dev/zh/guide/start/quick-start) 来开始体验 Rsdoctor

## 🔥 特性

- **编译可视化**：Rsdoctor 将编译行为及耗时进行可视化展示，方便开发同学查看构建问题。

https://github.com/user-attachments/assets/3400e0a2-a1dc-4a14-9466-6283af9dd9ed

- **多种分析能力**：支持构建产物、构建时分析能力：
  - 构建产物支持资源列表及模块依赖等。
  - 构建时分析支持 Loader、Plugin、Resolver 构建过程分析。
  - 支持 Rspack 的 builtin:swc-loader 分析。
  - 构建规则支持重复包检测及 ES Version Check 检查等。
- **支持自定义规则**：除了内置构建扫描规则外，还支持用户根据 Rsdoctor 的构建数据添加自定义构建扫描规则。
- **框架无关**：支持所有基于 Webpack 或 Rspack 构建的项目。

## 🤝 参与贡献

> 欢迎参与 Rsdoctor 贡献！

请阅读 [贡献指南](https://github.com/web-infra-dev/rsdoctor/blob/main/CONTRIBUTING.md) 来共同参与 Rsdoctor 的建设。

## 🧑‍💻 社区

欢迎加入我们的 [Discord](https://discord.gg/wrBPBT6rkM) 交流频道！Rsdoctor 团队和用户都在那里活跃，并且我们一直期待着各种贡献。

你也可以加入 [飞书群](https://applink.feishu.cn/client/chat/chatter/add_by_link?link_token=3c3vca77-bfc0-4ef5-b62b-9c5c9c92f1b4) 与大家一起交流。

## 🪐 相关链接

- [Rspack](https://github.com/web-infra-dev/rspack): 基于 rust 的 web 构建器。
- [Rsbuild](https://github.com/web-infra-dev/rsbuild): 基于 Rspack 的 web 构建工具。
- [Rslib](https://github.com/web-infra-dev/rslib): 基于 Rsbuild 的 library 开发工具。
- [Rspress](https://github.com/web-infra-dev/rspress): 基于 Rsbuild 的静态站点生成器。
- [Modern.js](https://github.com/web-infra-dev/modern.js): 基于 Rsbuild 的渐进式 React 框架。

## 🙌 行为准则

本仓库采纳了字节跳动的开源项目行为准则。请点击 [行为准则](./CODE_OF_CONDUCT.md) 查看更多的信息。

## 🙏 致谢

Rsdoctor 的一些实现参考了社区中杰出的项目，对他们表示感谢：

- [bundle-stats](https://github.com/relative-ci/bundle-stats/tree/master/packages/cli#readme)是一个优秀的构建产物分析工具，Rsdoctor 在构建产物分析方面受到了它的启发。
- [webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer) 是一个经典的 Webpack 构建产物分析工具，Rsdoctor 在构建产物分析方面受到了它的启发，同时 Rsdoctor 使用了其经典的瓦片图。
- [Statoscope](https://github.com/statoscope/statoscope/blob/master/README.md)是一个优秀的构建产物分析工具，Rsdoctor 在构建产物分析方面受到了它的启发。
- [Webpack 团队和社区](https://github.com/webpack/webpack/blob/main/README.md) 创建了一个优秀的打包工具和丰富的生态。
- [vite-plugin-inspect](https://github.com/antfu/vite-plugin-inspect) 启发了 Rsdoctor 对构建过程分析的探索。

Rsdoctor 网站由 [Netlify](https://www.netlify.com/) 提供支持。

## 📖 License

Rsdoctor 项目基于 [MIT 协议](https://github.com/web-infra-dev/rsdoctor/blob/main/LICENSE)，请自由地享受和参与开源。
