# @rsdoctor/mcp-server

## 介绍

@rsdoctor/mcp-server 是一个 MCP Server 工具，旨在帮助用户更便捷地使用 Rsdoctor 的构建数据。它可以与 Rsdoctor 的本地构建分析数据配合使用，通过问答的形式，帮助你快速获取构建分析结果。

## 主要功能

目前支持以下四大类分析能力:

- **产物信息分析**: 分析构建产物的体积、组成等信息
- **依赖问题分析**: 分析项目依赖关系、重复依赖等问题
- **产物优化建议**: 提供产物体积优化、代码分割等建议
- **编译优化建议**: 分析编译耗时，提供编译性能优化建议

## 使用示例

### 1. 产物优化分析

通过提问 "Please help me to optimize the bundle or artifacts"，工具会分析构建产物并给出优化建议。

示例视频:

https://github.com/user-attachments/assets/c73e55a9-445d-481d-8dbd-cf99bfca680f

### 2. 依赖分析

通过提问 "Please investigate the referrer dependency of node_modules/dayjs/index.js"，工具会分析指定模块的依赖关系。

示例视频:

https://github.com/user-attachments/assets/312cf5ce-19bd-49e7-87bb-aab1fc8a6a43

### 3. 编译性能分析

通过提问 "Please help me find files or loaders with high compilation time and provide optimization suggestions"，工具会分析编译耗时并给出优化建议。

示例视频:

https://github.com/user-attachments/assets/cc0f5441-4950-420c-bbad-635e21e87492

## 配置说明

### 启动参数

- 配置链接的构建器名【可选】

```linux
npx @rsdoctor/mcp-server@latest --compiler web
```

### port

- 配置端口【可选】

```linux
npx -y @rsdoctor/mcp-server@latest --port 1000
```

需要注意的是，Rsdoctor 本地 Server 启动端口默认是随机的，所以如果要使用 port 参数，需要在 plugin 中配置 port 端口：

```js
export default {
  // ...
  tools: {
    bundlerChain: (chain) => {
      if (process.env.RSDOCTOR) {
        chain.plugin('Rsdoctor').use(RsdoctorRspackPlugin, [
          {
            port: 9988,
          },
        ]);
      }
    },
  },
};
```

## 用法

### 版本要求

需要使用以下 rsdoctor 插件（版本要求）：

- @rsdoctor/rspack-plugin >= 1.1.2
- @rsdoctor/webpack-plugin >= 1.1.2

注意：请确保使用最新版本以获得最佳体验。

### 1. 插件配置

#### 单构建器项目

单构建器项目中，无需任何配置，直接配置 MCP Client 即可。

#### 多构建器项目

多构建器项目中，因为每个构建器会有一份 Rsdoctor 构建分析数据，所以需要配置 compiler 参数，来指定 mcp-server 分析某一个构建器的 Rsdoctor 数据。

```linux
npx -y @rsdoctor/mcp-server@latest --compiler [compilerName]
```

### 2. 开启 Rsdoctor 并执行本地构建

开启 Rsdoctor 的情况下，执行构建。不要使用 **MCP Client** 启动项目，因为 Rsdoctor 的挂载的本地服务会卡住 **MCP Client** 的对话进程。

```linux
npm run build
```

- 注：如果配置了 `disableClientServer: true`，需要修改为 `disableClientServer: false`，disableClientServer 默认是 false。

### 3. 配置 MCP Client

#### Claude

在 claude_desktop_config.json 中添加如下配置：

```json
{
  "mcpServers": {
    "rsdoctor": {
      "command": "npx",
      "args": ["-y", "@rsdoctor/mcp-server@latest"]
    }
  }
}
```

连接成功后，此时你可以在 Cursor 的 MCP 面板中直接与 Rsdoctor 构建分析数据进行交互，提问产物、依赖、优化等相关问题。

#### Cursor

在 Cursor 编辑器中集成 @rsdoctor/mcp-server，通常只需在 .cursor/mcp.json 文件中添加服务器配置。

```json
{
  "mcpServers": {
    "rsdoctor": {
      "command": "npx",
      "args": ["-y", "@rsdoctor/mcp-server@latest"]
    }
  }
}
```

连接成功后，此时你可以在 Cursor 的 MCP 面板中直接与 Rsdoctor 构建分析数据进行交互，提问产物、依赖、优化等相关问题。

#### Cline

2. 在 Cline 配置文件中添加 MCP Server 配置。

```json
{
  "mcpServers": {
    "rsdoctor": {
      "command": "npx",
      "args": ["-y", "@rsdoctor/mcp-server@latest"]
    }
  }
}
```

连接成功后，此时你可以在 Cursor 的 MCP 面板中直接与 Rsdoctor 构建分析数据进行交互，提问产物、依赖、优化等相关问题。

## Tools 列表

1. get_chunks

- 获取所有代码块信息

2. get_chunk_by_id

- 根据 ID 获取特定代码块信息
- 输入: chunkId (Number)

3. get_modules

- 获取所有模块信息

4. get_module_by_id

- 根据 ID 获取模块信息
- 输入: moduleId (Number)

5. get_module_by_path

- 根据路径获取模块信息
- 输入: modulePath (string)

6. get_module_issuer_path

- 获取模块的来源路径
- 输入: moduleId (string)

7. get_package_info

- 获取当前包信息

8. get_package_dependencies

- 获取包的依赖列表

9. get_rule_info

- 获取构建规则扫描结果

10. get_duplicate_packages

- 获取重复安装的包列表

11. get_similar_packages

- 获取相似包列表

12. get_large_chunks

- 获取体积过大的代码块列表

13. get_media_asset_prompt

- 获取媒体资源优化建议

14. get_loader_time_all_files

- 获取每个文件的 loader 耗时

15. get_loader_times

- 获取编译目录的 loader 耗时
