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

## 💡 What is Rsdoctor?

- Rsdoctor is a one-stop tool for diagnosing and analyzing the build process and build artifacts.
- Rsdoctor is a tool that supports Webpack and Rspack build analysis.
- Rsdoctor is an analysis tool that can display the time-consuming and behavioral details of the compilation.
- Rsdoctor is a tool that can analyze the time-consuming and compilation process of the rspack builtin:swc-loader.

## 📌 Position

**Rsdoctor** is a build analysis tool for analyzing projects built with [Rspack](https://www.rspack.dev/) and [Webpack](https://webpack.js.org/). It supports analysis of projects such as [Rsbuild](https://rsbuild.dev/), [Create-react-app](https://create-react-app.dev/), [Modern.js](https://modernjs.dev/), and more.

<div align=center>
 <img src="https://github.com/web-infra-dev/rsdoctor/assets/18437716/4f28312a-68bf-4f9c-91cb-6fd603a37f53" alt="duplicate packages" />
</div>

## 📚 Getting started

To get started with Rsdoctor, see the [Quick Start](https://rsdoctor.dev/guide/start/quick-start).

## 🔥 Features

- **Compilation Visualization**: Rsdoctor visualizes the compilation behavior and time consumption, making it easy to view build issues.

https://github.com/user-attachments/assets/3400e0a2-a1dc-4a14-9466-6283af9dd9ed

- **Multiple Analysis Capabilities**: Rsdoctor supports build artifact, build-time analysis, and anti-degradation capabilities:

  - Build artifact support for resource lists and module dependencies, etc.
  - Build-time analysis supports Loader, Plugin, and Resolver building process analysis, including: **Rspack's builtin:swc-loader**.
  - Build rules support duplicate package detection and ES Version Check, etc.

- **Support Custom Rules**: In addition to built-in build scan rules, Rsdoctor also supports users adding custom component scan rules based on the build data of Rsdoctor.

- **Framework-Independent**: Rsdoctor support all projects built on Webpack or Rspack.

## 🤝 Contribution

> New contributors welcome!

Please read the [Contributing Guide](https://github.com/web-infra-dev/rsdoctor/blob/main/CONTRIBUTING.md).

## 🧑‍💻 Community

Come and chat with us on [Discord](https://discord.gg/wrBPBT6rkM)! The Rsdoctor team and users are active there, and we're always looking for contributions.

## 🪐 Link

- [Rspack](https://github.com/web-infra-dev/rspack): A fast Rust-based web bundler.
- [Rsbuild](https://github.com/web-infra-dev/rsbuild): An Rspack-based build tool for the web, rebranded from Modern.js Builder.
- [Rslib](https://github.com/web-infra-dev/rslib): A library development tool powered by Rsbuild.
- [Rspress](https://github.com/web-infra-dev/rspress): A fast Rspack-based static site generator.
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
