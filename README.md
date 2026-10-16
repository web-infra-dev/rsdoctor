<picture>
  <img alt="Rsdoctor Banner" width="100%" src="https://assets.rspack.rs/rsdoctor/rsdoctor-banner.png" />
</picture>

# Rsdoctor

<p>
  <a href="https://discord.gg/wrBPBT6rkM"><img src="https://img.shields.io/badge/chat-discord-blue?style=flat-square&logo=discord&colorA=564341&colorB=EDED91" alt="discord channel" /></a>
  <a href="https://npmjs.com/package/@rsdoctor/core?activeTab=readme"><img src="https://img.shields.io/npm/v/@rsdoctor/core?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" /></a>
  <a href="https://npmcharts.com/compare/@rsdoctor/core?minimal=true"><img src="https://img.shields.io/npm/dm/@rsdoctor/core.svg?style=flat-square&colorA=564341&colorB=EDED91" alt="downloads" /></a>
  <a href="https://github.com/web-infra-dev/rsdoctor/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@rsdoctor/core?style=flat-square&colorA=564341&colorB=EDED91" alt="license" /></a>
</p>

English | [简体中文](./README.zh-CN.md)

Rsdoctor is a build analysis tool for the [Rspack](https://rspack.rs/) ecosystem. It visualizes the build process and output to help developers investigate build issues and identify performance bottlenecks. It also provides build data to agents for automated diagnosis and optimization of JavaScript programs.

## 🔥 Features

- **Agent-Driven Analysis**: Provides build data to agents for automated diagnosis and optimization of JavaScript programs
- **Compilation Visualization**: Visualize the compilation process and timing to troubleshoot build issues and identify performance bottlenecks
- **Comprehensive Analysis**: Analyze build output, inspect the build process, and run diagnostic checks:
  - **Output Analysis**: Inspect assets, output sizes, and module dependencies
  - **Build Process Analysis**: Inspect Loader and Plugin execution and module resolution
  - **Diagnostic Checks**: Detect duplicate packages and check ECMAScript syntax versions to identify potential build issues

## 📚 Getting started

To get started with Rsdoctor, see the [Quick Start](https://rsdoctor.rs/guide/start/quick-start).

## 🤝 Contribution

> New contributors welcome!

Please read the [Contributing Guide](https://github.com/web-infra-dev/rsdoctor/blob/main/CONTRIBUTING.md).

## 🧑‍💻 Community

Come and chat with us on [Discord](https://discord.gg/wrBPBT6rkM)! The Rstack team and users are active there, and we're always looking for contributions.

## 🦀 Rstack

Rsdoctor is part of Rstack, the fast, unified JavaScript toolchain for developers and agents.

| Name                                                  | Description              | Version                                                                                                                                                                          |
| ----------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Rspack](https://github.com/web-infra-dev/rspack)     | Bundler                  | <a href="https://npmjs.com/package/@rspack/core"><img src="https://img.shields.io/npm/v/@rspack/core?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" /></a>     |
| [Rsbuild](https://github.com/web-infra-dev/rsbuild)   | Build tool               | <a href="https://npmjs.com/package/@rsbuild/core"><img src="https://img.shields.io/npm/v/@rsbuild/core?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" /></a>   |
| [Rslib](https://github.com/web-infra-dev/rslib)       | Library development tool | <a href="https://npmjs.com/package/@rslib/core"><img src="https://img.shields.io/npm/v/@rslib/core?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" /></a>       |
| [Rspress](https://github.com/web-infra-dev/rspress)   | Static site generator    | <a href="https://npmjs.com/package/@rspress/core"><img src="https://img.shields.io/npm/v/@rspress/core?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" /></a>   |
| [Rsdoctor](https://github.com/web-infra-dev/rsdoctor) | Build analyzer           | <a href="https://npmjs.com/package/@rsdoctor/core"><img src="https://img.shields.io/npm/v/@rsdoctor/core?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" /></a> |
| [Rstest](https://github.com/web-infra-dev/rstest)     | Testing framework        | <a href="https://npmjs.com/package/@rstest/core"><img src="https://img.shields.io/npm/v/@rstest/core?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" /></a>     |
| [Rslint](https://github.com/web-infra-dev/rslint)     | Linter                   | <a href="https://npmjs.com/package/@rslint/core"><img src="https://img.shields.io/npm/v/@rslint/core?style=flat-square&colorA=564341&colorB=EDED91" alt="npm version" /></a>     |

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
