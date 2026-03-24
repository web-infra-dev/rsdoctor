---
name: cli-anything-rsdoctor
description: CLI harness for rsdoctor build analyzer. Inspect manifest.json files, compare builds, list chunks/modules/packages/assets, detect duplicates, and manage the rsdoctor server.
version: 0.1.0
commands:
  - name: manifest info
    description: Show manifest metadata (hash, root, chunk/module/package/asset counts, enabled routes)
    usage: cli-anything-rsdoctor manifest info <path> [--json]
  - name: manifest routes
    description: List enabled UI routes in the manifest
    usage: cli-anything-rsdoctor manifest routes <path> [--json]
  - name: bundle chunks
    description: List all chunks with sizes, sorted by size descending
    usage: cli-anything-rsdoctor bundle chunks <path> [--top N] [--min-size BYTES] [--json]
  - name: bundle modules
    description: List all modules with source/parsed sizes
    usage: cli-anything-rsdoctor bundle modules <path> [--top N] [--chunk ID] [--json]
  - name: bundle packages
    description: List NPM packages included in the bundle
    usage: cli-anything-rsdoctor bundle packages <path> [--top N] [--json]
  - name: bundle assets
    description: List all output assets with sizes
    usage: cli-anything-rsdoctor bundle assets <path> [--top N] [--json]
  - name: bundle large
    description: Find chunks, modules, and assets above a size threshold
    usage: cli-anything-rsdoctor bundle large <path> [--threshold BYTES] [--json]
  - name: bundle duplicates
    description: Detect duplicate NPM packages (same name, multiple versions)
    usage: cli-anything-rsdoctor bundle duplicates <path> [--json]
  - name: diff compare
    description: Compare two builds and list added/removed/changed chunks and modules
    usage: cli-anything-rsdoctor diff compare <current> <baseline> [--format json|table] [--json]
  - name: diff summary
    description: High-level diff statistics between two builds
    usage: cli-anything-rsdoctor diff summary <current> <baseline> [--json]
  - name: server start
    description: Start the rsdoctor analyze server
    usage: cli-anything-rsdoctor server start <path> [--port N] [--bg] [--json]
  - name: server stop
    description: Stop the running rsdoctor server
    usage: cli-anything-rsdoctor server stop [--json]
  - name: server status
    description: Show whether the rsdoctor server is running and its URL
    usage: cli-anything-rsdoctor server status [--json]
  - name: shell
    description: Interactive REPL for querying rsdoctor manifests
    usage: cli-anything-rsdoctor shell
---

# cli-anything-rsdoctor

CLI harness for the **rsdoctor** build analysis tool (webpack/rspack).

## What It Does

rsdoctor generates `manifest.json` files during a build. This harness lets you
inspect those manifests from the command line, compare two builds to spot
regressions, and manage the rsdoctor analysis server.

## Installation

```bash
pip install cli-anything-rsdoctor
# or from source
pip install -e /path/to/agent-harness
```

## Quick Start

```bash
# Inspect a build
cli-anything-rsdoctor manifest info .rsdoctor/manifest.json

# List the 10 largest chunks
cli-anything-rsdoctor bundle chunks .rsdoctor/manifest.json --top 10

# Compare current build against a baseline
cli-anything-rsdoctor diff summary current/manifest.json baseline/manifest.json

# Machine-readable output
cli-anything-rsdoctor bundle chunks .rsdoctor/manifest.json --json | jq '.[0]'

# Interactive REPL
cli-anything-rsdoctor shell
```

## JSON Output Mode

Every command supports `--json`. When used:

- Only valid JSON is written to **stdout**
- Error messages go to **stderr**
- Exit code is 0 for success, 1 for errors

## REPL Commands

Inside `cli-anything-rsdoctor shell`:

```text
rsdoctor> load /path/to/manifest.json
rsdoctor> info
rsdoctor> chunks --top 10
rsdoctor> modules --top 20
rsdoctor> packages
rsdoctor> quit
```

## Manifest JSON Structure

```json
{
  "client": { "enableRoutes": ["Overall", "Bundle.BundleSize", "..."] },
  "data": {
    "hash": "...",
    "root": "/path/to/project",
    "chunkGraph": {
      "chunks": [
        { "id": "...", "name": "...", "size": 12345, "initial": true }
      ],
      "assets": [{ "path": "dist/main.js", "size": 12345 }]
    },
    "moduleGraph": {
      "modules": [
        {
          "id": "...",
          "path": "...",
          "size": { "sourceSize": 1000, "parsedSize": 850 }
        }
      ]
    },
    "packageGraph": {
      "packages": [
        { "id": "...", "name": "react", "version": "18.2.0", "size": 44000 }
      ]
    },
    "summary": { "costs": [{ "name": "webpack", "value": 3200 }] }
  }
}
```
