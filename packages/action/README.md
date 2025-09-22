# Compressed Size Action Demo

这是一个简化版的 GitHub Action，用于检查代码变更前后的文件压缩大小差异。

## 功能

- 智能检测 GitHub 事件类型，自动执行相应操作
- **MR 提交时**：只下载目标分支的工件（如果存在）
- **MR 合入时**：只上传当前分支的工件
- 支持自定义文件路径
- 通过 GitHub API 查找目标分支的最新 commit
- 工件按 commit hash 命名，避免冲突

## 智能行为

### 🔄 MR 合入时（push 到主分支）

- 只上传当前分支的工件
- 工件命名：`路径-文件名-commithash.扩展名`
- 用于保存最新的基准数据

### 📥 MR 提交时（pull_request 事件）

- 只下载目标分支的工件（如果存在）
- 如果找到目标分支工件，则下载并比较
- 如果没有找到，则打印 "No baseline data found"
- 用于比较当前变更与基准数据

## 配置

```yaml
- uses: ./
  with:
    # GitHub token，用于访问 API
    github_token: ${{ secrets.GITHUB_TOKEN }}

    # 要上传的文件路径（相对于项目根目录）
    file_path: 'artifacts/1.json'

    # 目标分支（默认为 main）
    target_branch: 'main'
```

## 工件命名规则

工件将使用以下格式命名：

- 格式：`路径-文件名-commithash.扩展名`
- 示例：`artifacts-1-f18c5686ba.json`

## 使用场景

### 场景 1：MR 提交时

```yaml
on:
  pull_request:
    types: [opened, synchronize]
```

Action 会：

1. 查找目标分支最新 commit
2. 尝试下载对应的工件
3. 如果找到真实基准数据，则使用真实数据进行比较
4. 如果没找到，则使用内置的 demo 数据作为基准进行对比展示
5. 生成 Bundle Size Report 卡片

### 场景 2：MR 合入时

```yaml
on:
  push:
    branches: [main]
```

Action 会：

1. 上传当前分支的工件
2. 生成简单的 Bundle Size Report 卡片
3. 工件将作为后续 MR 的基准数据

## 报告卡片示例

Action 会在 GitHub CI 中生成如下格式的报告卡片：

### 📦 Bundle Size Report

| Metric         | Current  | Baseline |
| -------------- | -------- | -------- |
| 📊 Total Size  | 100.0 MB | 99.0 MB  |
| 📁 Files Count | 3        | 3        |

### 📄 File Details

| File            | Size    |
| --------------- | ------- |
| dist/main.js    | 50.0 MB |
| dist/vendor.js  | 40.0 MB |
| dist/styles.css | 10.0 MB |

## JSON 文件格式

您的 `file_path` 指向的 JSON 文件应包含以下格式的数据：

```json
{
  "totalSize": 104857600,
  "files": [
    {
      "path": "dist/main.js",
      "size": 52428800,
      "gzipSize": 10485760,
      "brotliSize": 8388608
    },
    {
      "path": "dist/vendor.js",
      "size": 41943040
    }
  ]
}
```

- `totalSize`: 总大小（字节）
- `files`: 文件列表，每个文件包含路径和大小信息

## Demo 基准数据

当无法找到目标分支的真实工件时，Action 会自动使用内置的 demo 数据作为基准进行对比：

```json
{
  "totalSize": 103809024, // ~99MB
  "files": [
    {
      "path": "dist/main.js",
      "size": 51380224 // ~49MB
    },
    {
      "path": "dist/vendor.js",
      "size": 41943040 // ~40MB
    },
    {
      "path": "dist/styles.css",
      "size": 10485760 // ~10MB
    }
  ]
}
```

这样即使是首次运行或没有历史数据时，也能生成有意义的对比报告，帮助开发者了解当前构建的大小情况。

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build
```
