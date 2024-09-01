- **normal 模式：** 在构建产物目录中生成一个 `.rsdoctor` 文件夹，其中包含各种数据文件，并在报告页面中展示代码。输出目录可以通过 [reportDir](/config/options/options#reportdir) 进行配置。

- **brief 模式：** 在构建产物目录的 `.rsdoctor` 文件夹中生成一个 HTML 报告文件，所有构建分析数据会整合注入到这个 HTML 文件中，可以通过浏览器打开该 HTML 文件查看报告。brief 模式还有更多配置项，详细信息请参阅：[brief](/config/options/options#brief).

- **lite 模式：** 基于普通模式，不展示源码和产物代码，仅显示打包后的代码信息。
