# Compressed Size Action Demo

This is a simplified GitHub Action for checking file compression size differences before and after code changes.

## Features

- Intelligently detects GitHub event types and automatically executes corresponding operations
- **On MR submission**: Only downloads artifacts from the target branch (if they exist)
- **On MR merge**: Only uploads artifacts from the current branch
- Supports custom file paths
- Finds the latest commit of the target branch through GitHub API
- Artifacts are named by commit hash to avoid conflicts

## Smart Behavior

### 🔄 On MR Merge (push to main branch)

- Only uploads artifacts from the current branch
- Artifact naming: `path-filename-commithash.extension`
- Used to save the latest baseline data

### 📥 On MR Submission (pull_request event)

- Only downloads artifacts from the target branch (if they exist)
- If target branch artifacts are found, downloads and compares them
- If not found, prints "No baseline data found"
- Used to compare current changes with baseline data

## Configuration

```yaml
- uses: ./
  with:
    # GitHub token for API access
    github_token: ${{ secrets.GITHUB_TOKEN }}

    # File path to upload (relative to project root)
    file_path: 'artifacts/1.json'

    # Target branch (defaults to main)
    target_branch: 'main'
```

## Artifact Naming Rules

Artifacts will be named using the following format:

- Format: `path-filename-commithash.extension`
- Example: `artifacts-1-f18c5686ba.json`

## Usage Scenarios

### Scenario 1: On MR Submission

```yaml
on:
  pull_request:
    types: [opened, synchronize]
```

The Action will:

1. Find the latest commit of the target branch
2. Attempt to download the corresponding artifacts
3. If real baseline data is found, use real data for comparison
4. If not found, use built-in demo data as baseline for comparison display
5. Generate a Bundle Size Report card

### Scenario 2: On MR Merge

```yaml
on:
  push:
    branches: [main]
```

The Action will:

1. Upload artifacts from the current branch
2. Generate a simple Bundle Size Report card
3. Artifacts will serve as baseline data for subsequent MRs

## Report Card Example

The Action will generate a report card in the following format in GitHub CI:

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

## JSON File Format

The JSON file pointed to by your `file_path` should contain data in the following format:

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

- `totalSize`: Total size (in bytes)
- `files`: List of files, each containing path and size information

## Demo Baseline Data

When real artifacts from the target branch cannot be found, the Action will automatically use built-in demo data as baseline for comparison:

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

This way, even on first run or when there's no historical data, meaningful comparison reports can be generated to help developers understand the current build size situation.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build
```
