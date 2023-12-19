# Rsdoctor

English | [简体中文](./README.zh-CN.md)

## 💡 What is Rsdoctor?

- Rsdoctor is a one-stop tool for diagnosing and analyzing the build process and build artifacts.
- Rsdoctor is a tool that supports Webpack and Rspack build analysis.
- Rsdoctor is an analysis tool that can display the time-consuming and behavioral details of the compilation.
- Rsdoctor is a tool that provides bundle Diff and other anti-degradation capabilities simultaneously.

## 🔥 Features

- **Compilation Visualization**: Rsdoctor visualizes the compilation behavior and time consumption, making it easy to view build issues.
  
| <img src="https://lf3-static.bytednsdoc.com/obj/eden-cn/lognuvj/rsdoctor/loader-timeline.png" width='400' alt="loader timeline" /> | <img src="https://lf3-static.bytednsdoc.com/obj/eden-cn/lognuvj/rsdoctor/rsdoctor-analyze-code.png" width='400' alt="loader codes" /> |
| ---------------------------------------------------------- | ------------------------------------------------ |

- **Multiple Analysis Capabilities**: Rsdoctor supports build artifact, build-time analysis, and anti-degradation capabilities:

  - Build artifact support for resource lists and module dependencies, etc.
  - Build-time analysis supports Loader, Plugin, and Resolver building process analysis.
  - Build rules support duplicate package detection and ESC checking, etc.
  - Currently, bundle Diff capabilities are also available.

<div align=center>
 <img src="https://lf3-static.bytednsdoc.com/obj/eden-cn/lognuvj/rsdoctor/duplicate-pkgs.png" alt="duplicate packages" width='50%' style="margin-left: 25%" />
</div>

- **Support Custom Rules**: In addition to built-in build scan rules, Rsdoctor also supports users adding custom component scan rules based on the build data of Rsdoctor.

- **Framework-Independent**: Rsdoctor support all projects built on Webpack or Rspack.

## 🤝 Contribution

> New contributors welcome!

Please read the [Contributing Guide](https://github.com/web-infra-dev/rsdoctor/blob/main/CONTRIBUTING.md).

## 🧑‍💻 Community

Come and chat with us on [Discord](https://discord.gg/mScJfeeT)! The Rsdoctor team and users are active there, and we're always looking for contributions.

## 🙌 Code of Conduct

This repo has adopted the ByteDance Open Source Code of Conduct. Please check [Code of Conduct](./CODE_OF_CONDUCT.md) for more details.

## 🙏 Credits

Some of the implementation of Rsdoctor refers to the excellent projects in the community, and we would like to thank them:

- Some analysis logics are referenced from [bundle-stats](https://github.com/relative-ci/bundle-stats/tree/master/packages/cli#readme).
- The built-in analysis graph in the build artifact page is from [webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer).

## 📖 License

Rsdoctor is licensed under the [MIT License](https://github.com/web-infra-dev/rsdoctor/blob/main/LICENSE).
