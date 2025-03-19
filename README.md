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

English | [简体中文](./README.zh-CN.md)

Rsdoctor is a build analyzer tailored for the [Rspack](https://rspack.dev/) ecosystem and fully compatible with the [webpack](https://webpack.js.org/) ecosystem.

Rsdoctor is committed to being a one-stop, intelligent build analysis tool that makes the entire build process transparent, predictable, and optimizable through visualization and smart analysis, helping development teams precisely identify bottlenecks, optimize performance, and improve engineering quality.

Rsdoctor supports all tools and frameworks based on Rspack or webpack, such as: [Docusaurus](https://docusaurus.io/docs/api/plugins/@docusaurus/plugin-rsdoctor), [Rspeedy (Lynx)](https://lynxjs.org/rspeedy/), [Storybook](https://github.com/rspack-contrib/storybook-rsbuild), [Next.js](https://nextjs.org/), [Nuxt](https://nuxt.com/), [Re.Pack](https://re-pack.dev/), [Modern.js](https://modernjs.dev/), [Rsbuild](https://rsbuild.dev/), [Rspress](https://rspress.dev/) and [Rslib](https://lib.rsbuild.dev/).

https://github.com/user-attachments/assets/b8bb4ebf-b823-47bc-91ab-2d74f0057ef7

## 🔥 Features

- **Compilation Visualization**: Rsdoctor visualizes the compilation behavior and time consumption, making it easy to view build issues.

- **Multiple Analysis Capabilities**: Rsdoctor supports build artifact, build-time analysis, and anti-degradation capabilities:

  - Build artifact support for resource lists and module dependencies, etc.
  - Build-time analysis supports Loader, Plugin, and Resolver building process analysis, including: **Rspack's builtin:swc-loader**.
  - Build rules support duplicate package detection and ES Version Check, etc.

- **Support Custom Rules**: In addition to built-in build scan rules, Rsdoctor also supports users adding custom component scan rules based on the build data of Rsdoctor.

## 📚 Getting started

To get started with Rsdoctor, see the [Quick Start](https://rsdoctor.dev/guide/start/quick-start).

## 🤝 Contribution

> New contributors welcome!

Please read the [Contributing Guide](https://github.com/web-infra-dev/rsdoctor/blob/main/CONTRIBUTING.md).

## 🧑‍💻 Community

Come and chat with us on [Discord](https://discord.gg/wrBPBT6rkM)! The Rsdoctor team and users are active there, and we're always looking for contributions.

## 🪐 Link

- [Rspack](https://github.com/web-infra-dev/rspack): A fast Rust-based web bundler.
- [Rsbuild](https://github.com/web-infra-dev/rsbuild): An Rspack-based build tool.
- [Rslib](https://github.com/web-infra-dev/rslib): A library development tool powered by Rsbuild.
- [Rspress](https://github.com/web-infra-dev/rspress): A fast Rsbuild-based static site generator.
- [Modern.js](https://github.com/web-infra-dev/modern.js): A progressive React framework based on Rsbuild.

## 🙌 Code of conduct

This repo has adopted the ByteDance Open Source Code of Conduct. Please check [Code of Conduct](./CODE_OF_CONDUCT.md) for more details.

## 🙏 Credits

Some of the implementation of Rsdoctor refers to the excellent projects in the community, and we would like to thank them:

- [bundle-stats](https://github.com/relative-ci/bundle-stats/tree/master/packages/cli#readme) is an excellent tool for analyzing build artifacts, and Rsdoctor is inspired by it in terms of build analysis.
- [webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer) is a classic tool for analyzing Webpack, and Rsdoctor is inspired by it in terms of build artifact analysis. Rsdoctor also uses its classic treemap visualization.
- [Statoscope](https://github.com/statoscope/statoscope/blob/master/README.md) is an excellent tool for analyzing build artifacts, and Rsdoctor is inspired by it in terms of build analysis.
- [Webpack Team and Community](https://github.com/webpack/webpack/blob/main/README.md) have created an excellent bundling tool and a rich ecosystem.
- [vite-plugin-inspect](https://github.com/antfu/vite-plugin-inspect) has inspired Rsdoctor's exploration of build process analysis.

This Rsdoctor website is powered by [Netlify](https://www.netlify.com/).

## 📖 License

Rsdoctor is licensed under the [MIT License](https://github.com/web-infra-dev/rsdoctor/blob/main/LICENSE).
