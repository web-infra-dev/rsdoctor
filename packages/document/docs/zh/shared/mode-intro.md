- **normal 模式：** 在构建产物目录中生成一个 `.rsdoctor` 文件夹，其中包含各种数据文件，并在报告页面中展示代码。输出目录可以通过 [reportDir](/config/options/output#reportdir) 进行配置。

- **brief 模式：** 在构建产物目录的 `.rsdoctor` 文件夹中生成一个 HTML 报告文件，所有构建分析数据会整合注入到该文件中，可以直接通过浏览器打开。详细配置请参考 [brief 输出配置](/config/options/output#mode-brief)。

- **lite 模式：** 基于普通模式，不展示源码和产物代码，仅显示打包后的代码信息。
  - 顶层 `mode: 'lite'` 已在 Rsdoctor 2.x 中移除，`features.lite` 也已废弃。请使用 [output.reportCodeType](/config/options/output#reportcodetype) 代替。
