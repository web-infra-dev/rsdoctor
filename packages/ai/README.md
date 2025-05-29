# @rsdoctor/mcp-server

English | [简体中文](./README.zh-CN.md)

## Introduction

@rsdoctor/mcp-server is an MCP Server tool designed to help users more conveniently utilize Rsdoctor's build data. It works with Rsdoctor's local build analysis data and helps you quickly obtain build analysis results through a Q&A interface.

## Features

Currently supports four main types of analysis capabilities:

- **Build Artifact Analysis**: Analyzes the size and composition of build artifacts
- **Dependency Analysis**: Analyzes project dependencies and duplicate dependency issues
- **Bundle Optimization Suggestions**: Provides suggestions for bundle size optimization and code splitting
- **Build Performance Suggestions**: Analyzes build time and provides build performance optimization suggestions

## Examples

### 1. Bundle Optimization Analysis

By asking "Please help me to optimize the bundle or artifacts", the tool will analyze the build artifacts and provide optimization suggestions.

Example video:

https://github.com/user-attachments/assets/c73e55a9-445d-481d-8dbd-cf99bfca680f

### 2. Dependency Analysis

By asking "Please investigate the referrer dependency of node_modules/dayjs/index.js", the tool will analyze the dependency relationships of the specified module.

Example video:

https://github.com/user-attachments/assets/312cf5ce-19bd-49e7-87bb-aab1fc8a6a43

### 3. Build Performance Analysis

By asking "Please help me find files or loaders with high compilation time and provide optimization suggestions", the tool will analyze build time and provide optimization suggestions.

Example video:

https://github.com/user-attachments/assets/cc0f5441-4950-420c-bbad-635e21e87492

## Configuration

### Parameters

#### compiler

- Configure the name of the linked bundler (optional)

For multi-compiler projects, since each compiler will have its own Rsdoctor build analysis data, you need to configure the compiler parameter to specify which bundler's Rsdoctor data the mcp-server should analyze. Rsdoctor-mcp do not currently support analyzing multiple Rsdoctor data sets simultaneously.

```linux
npx @rsdoctor/mcp-server@latest --compiler [compilerName]
```

#### port

- Configure the port (optional)

```linux
npx -y @rsdoctor/mcp-server@latest --port 9988
```

Note: By default, the Rsdoctor local server starts on a random port. Therefore, if you want to use the port parameter, you need to configure the port in the plugin:

```js
new RsdoctorRspackPlugin({
  port: 9988,
});
```

## Usage

### Version Requirements

The following Rsdoctor plugins are required (version requirements):

- @rsdoctor/rspack-plugin >= 1.1.2
- @rsdoctor/webpack-plugin >= 1.1.2

**Note: Please ensure you are using the latest version for the best experience.**

### 1. Plugin Configuration

If you haven't added the Rsdoctor plugin yet, you'll need to configure it in your project, [👉🏻 Quick Start](https://rsdoctor.rs/guide/start/quick-start).

### 2. Enable Rsdoctor and Run Local Build

With Rsdoctor enabled, execute the build process. **Do not use the MCP Client to start the project, as Rsdoctor's local server will block the MCP Client's conversation process.**

```linux
npm run build
```

- Note: If you have set `disableClientServer: true`, change it to `disableClientServer: false`. By default, disableClientServer is set to false.

### 3. Configure MCP Client

#### Claude

Add the following configuration to `claude_desktop_config.json`:

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

Once connected, you can interact directly with Rsdoctor's build analysis data in the MCP panel of Cursor, asking questions about artifacts, dependencies, optimizations, and more.

### Cursor

To integrate @rsdoctor/mcp-server in the Cursor editor, usually you only need to add the server configuration in the `.cursor/mcp.json` file.

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

Once connected, you can interact directly with Rsdoctor's build analysis data in the MCP panel of Cursor, asking questions about artifacts, dependencies, optimizations, and more.

### Cline

Add the MCP Server configuration in the Cline configuration file.

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

Once connected, you can interact directly with Rsdoctor's build analysis data in the MCP panel of Cursor, asking questions about artifacts, dependencies, optimizations, and more.

## Tools List

1. get_chunks

- Retrieve information about all code chunks

2. get_chunk_by_id

- Retrieve information about a specific chunk by ID
- Input: chunkId (Number)

3. get_modules

- Retrieve information about all modules

4. get_module_by_id

- Retrieve information about a module by ID
- Input: moduleId (Number)

5. get_module_by_path

- Retrieve information about a module by path
- Input: modulePath (string)

6. get_module_issuer_path

- Retrieve the issuer path of a module
- Input: moduleId (string)

7. get_package_info

- Retrieve information about the current package

8. get_package_dependencies

- Retrieve the list of package dependencies

9. get_rule_info

- Retrieve build rule scan results

10. get_duplicate_packages

- Retrieve the list of duplicate packages

11. get_similar_packages

- Retrieve the list of similar packages

12. get_large_chunks

- Retrieve the list of oversized code chunks

13. get_media_asset_prompt

- Retrieve media asset optimization suggestions

14. get_loader_time_all_files

- Retrieve loader time for each file

15. get_loader_times

- Retrieve loader times for compiled directories
