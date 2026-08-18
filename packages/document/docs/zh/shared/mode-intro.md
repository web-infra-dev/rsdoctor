- **normal 模式：** 在构建产物目录中生成一个 `.rsdoctor` 文件夹，其中包含各种数据文件，并在报告页面中展示代码。输出目录可以通过 [reportDir](/config/options/output#reportdir) 进行配置。

- **brief 模式：** 在构建产物目录中生成 `rsdoctor-report.html`。所有构建分析数据都会整合并注入这个独立 HTML 文件，可以直接在浏览器中打开。可用配置项请参阅 [mode: 'brief'](/config/options/output#mode-brief)。

- **lite 模式：** 基于普通模式，不展示源码和产物代码，仅显示打包后的代码信息。
  - 顶层 `mode: 'lite'` 配置已在 Rsdoctor 2.x 中移除且会被忽略。`features` lite 配置仍受支持。新配置请使用 [output.reportCodeType](/config/options/output#reportcodetype)。
