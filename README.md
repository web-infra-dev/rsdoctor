<picture>
  <img alt="Rsdoctor Banner" width="100%" src="https://github.com/web-infra-dev/rsdoctor/assets/7237365/0f9d2e86-d919-451a-befa-fa84603a87cf">
</picture>


# Rsdoctor

English | [简体中文](./README.zh-CN.md)

## 💡 What is Rsdoctor?

<div align=center>
 <img src="https://github.com/web-infra-dev/rsdoctor/assets/18437716/7fa6728b-7f13-4621-8030-33326f86e483" alt="duplicate packages" width='50%' style="margin-left: 25%" />
</div>

- Rsdoctor is a one-stop tool for diagnosing and analyzing the build process and build artifacts.
- Rsdoctor is a tool that supports Webpack and Rspack build analysis.
- Rsdoctor is an analysis tool that can display the time-consuming and behavioral details of the compilation.
- Rsdoctor is a tool that provides bundle Diff and other anti-degradation capabilities simultaneously.

## 🔥 Features

- **Compilation Visualization**: Rsdoctor visualizes the compilation behavior and time consumption, making it easy to view build issues.
  
| <img src="https://github.com/web-infra-dev/rsdoctor/assets/18437716/5d985bae-dd91-4856-b112-00b18f13502c" alt="loader timeline" /> | <img src="https://github.com/web-infra-dev/rsdoctor/assets/18437716/172f5328-4508-4f4b-b53b-27ec1095ef9d" alt="loader codes" /> |
| ---------------------------------------------------------- | ------------------------------------------------ |

- **Multiple Analysis Capabilities**: Rsdoctor supports build artifact, build-time analysis, and anti-degradation capabilities:

  - Build artifact support for resource lists and module dependencies, etc.
  - Build-time analysis supports Loader, Plugin, and Resolver building process analysis.
  - Build rules support duplicate package detection and ES Version Check, etc.
  - Currently, bundle Diff capabilities are also available.

- **Support Custom Rules**: In addition to built-in build scan rules, Rsdoctor also supports users adding custom component scan rules based on the build data of Rsdoctor.

- **Framework-Independent**: Rsdoctor support all projects built on Webpack or Rspack.

## 🤝 Contribution

> New contributors welcome!

Please read the [Contributing Guide](https://github.com/web-infra-dev/rsdoctor/blob/main/CONTRIBUTING.md).

## 🧑‍💻 Community

Come and chat with us on [Discord](https://discord.gg/wrBPBT6rkM)! The Rsdoctor team and users are active there, and we're always looking for contributions.

## 🙌 Code of Conduct

This repo has adopted the ByteDance Open Source Code of Conduct. Please check [Code of Conduct](./CODE_OF_CONDUCT.md) for more details.

## 🙏 Credits

Some of the implementation of Rsdoctor refers to the excellent projects in the community, and we would like to thank them:

- Some analysis logics are referenced from [bundle-stats](https://github.com/relative-ci/bundle-stats/tree/master/packages/cli#readme).
- The built-in analysis graph in the build artifact page is from [webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer).

## 🚧 Notice

The Rsdoctor features and official website documentation are currently under development. Please wait for the 0.1.0 version.

## 📖 License

Rsdoctor is licensed under the [MIT License](https://github.com/web-infra-dev/rsdoctor/blob/main/LICENSE).
